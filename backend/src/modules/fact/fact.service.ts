import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Fact, FactState } from '../../entities/fact.entity';
import { Corpus } from '../../entities/corpus.entity';
import { Project } from '../../entities/project.entity';
import { ProjectMember, ProjectRole } from '../../entities/project-member.entity';
import { User, ApplicationRole } from '../../entities/user.entity';
import { CreateFactDto } from './dto/create-fact.dto';
import { UpdateFactDto } from './dto/update-fact.dto';
import { AddSupportDto } from './dto/add-support.dto';

@Injectable()
export class FactService {
  constructor(
    @InjectRepository(Fact)
    private readonly factRepository: Repository<Fact>,
    @InjectRepository(Corpus)
    private readonly corpusRepository: Repository<Corpus>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(ProjectMember)
    private readonly projectMemberRepository: Repository<ProjectMember>,
  ) {}

  async findAll(
    user: User,
    corpusId?: string,
    page = 1,
    limit = 10,
  ): Promise<{ data: Fact[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;

    const queryBuilder = this.factRepository
      .createQueryBuilder('fact')
      .leftJoinAndSelect('fact.corpus', 'corpus')
      .leftJoinAndSelect('fact.basis', 'basis')
      .leftJoinAndSelect('fact.supports', 'supports')
      .skip(skip)
      .take(limit)
      .orderBy('fact.createdAt', 'DESC');

    if (corpusId) {
      // Check access to corpus
      const corpus = await this.corpusRepository.findOne({
        where: { id: corpusId },
        relations: ['project'],
      });

      if (!corpus) {
        throw new NotFoundException('Corpus not found');
      }

      await this.checkProjectAccess(
        corpus.projectId,
        user,
        ProjectRole.VIEWER,
      );
      queryBuilder.where('fact.corpusId = :corpusId', { corpusId });
    } else {
      // Filter by accessible projects
      if (user.applicationRole !== ApplicationRole.ADMIN) {
        queryBuilder
          .leftJoin('corpus.project', 'project')
          .leftJoin('project.members', 'member')
          .where('project.ownerId = :userId', { userId: user.id })
          .orWhere('member.userId = :userId', { userId: user.id });
      }
    }

    const [data, total] = await queryBuilder.getManyAndCount();

    return { data, total, page, limit };
  }

  async findOne(id: string, user: User): Promise<Fact> {
    const fact = await this.factRepository.findOne({
      where: { id },
      relations: ['corpus', 'corpus.project', 'basis', 'supports', 'supportedBy'],
    });

    if (!fact) {
      throw new NotFoundException(`Fact with ID ${id} not found`);
    }

    // Check access
    await this.checkProjectAccess(
      fact.corpus.projectId,
      user,
      ProjectRole.VIEWER,
    );

    return fact;
  }

  async create(createFactDto: CreateFactDto, user: User): Promise<Fact> {
    const { corpusId, basisId, statement, state, meta } = createFactDto;

    // Get corpus and check access
    const corpus = await this.corpusRepository.findOne({
      where: { id: corpusId },
      relations: ['project'],
    });

    if (!corpus) {
      throw new NotFoundException('Corpus not found');
    }

    await this.checkProjectAccess(
      corpus.projectId,
      user,
      ProjectRole.CONTRIBUTOR,
    );

    // Validate basis if provided
    if (basisId) {
      const basisFact = await this.factRepository.findOne({
        where: { id: basisId },
        relations: ['corpus'],
      });

      if (!basisFact) {
        throw new NotFoundException('Basis fact not found');
      }

      // Basis must be in same corpus or corpus's basis corpus
      if (
        basisFact.corpusId !== corpusId &&
        basisFact.corpusId !== corpus.basisCorpusId
      ) {
        throw new BadRequestException(
          'Basis fact must be in the same corpus or in the corpus basis corpus',
        );
      }
    }

    // Determine state - empty statement should be CLARIFY
    const factState =
      !statement || statement.trim() === ''
        ? FactState.CLARIFY
        : state || FactState.READY;

    const fact = this.factRepository.create({
      statement: statement || undefined,
      corpusId,
      basisId,
      state: factState,
      meta,
    });

    return this.factRepository.save(fact);
  }

  async update(
    id: string,
    updateFactDto: UpdateFactDto,
    user: User,
  ): Promise<Fact> {
    const fact = await this.findOne(id, user);

    // Check access
    await this.checkProjectAccess(
      fact.corpus.projectId,
      user,
      ProjectRole.CONTRIBUTOR,
    );

    // If corpus is being changed, validate new corpus
    if (updateFactDto.corpusId && updateFactDto.corpusId !== fact.corpusId) {
      const newCorpus = await this.corpusRepository.findOne({
        where: { id: updateFactDto.corpusId },
        relations: ['project'],
      });

      if (!newCorpus) {
        throw new NotFoundException('New corpus not found');
      }

      await this.checkProjectAccess(
        newCorpus.projectId,
        user,
        ProjectRole.CONTRIBUTOR,
      );

      // Note: Database trigger will handle decoupling relationships
    }

    // Validate basis if being updated
    if (updateFactDto.basisId !== undefined) {
      if (updateFactDto.basisId) {
        const basisFact = await this.factRepository.findOne({
          where: { id: updateFactDto.basisId },
          relations: ['corpus'],
        });

        if (!basisFact) {
          throw new NotFoundException('Basis fact not found');
        }

        const targetCorpusId = updateFactDto.corpusId || fact.corpusId;
        const corpus = await this.corpusRepository.findOne({
          where: { id: targetCorpusId },
        });

        if (!corpus) {
          throw new NotFoundException('Corpus not found');
        }

        // Basis must be in same corpus or corpus's basis corpus
        if (
          basisFact.corpusId !== targetCorpusId &&
          basisFact.corpusId !== corpus.basisCorpusId
        ) {
          throw new BadRequestException(
            'Basis fact must be in the same corpus or in the corpus basis corpus',
          );
        }
      }
    }

    // Auto-update state based on statement
    if (updateFactDto.statement !== undefined) {
      if (!updateFactDto.statement || updateFactDto.statement.trim() === '') {
        updateFactDto.state = FactState.CLARIFY;
      } else if (!fact.statement || fact.statement.trim() === '') {
        // Statement was empty and now has content
        updateFactDto.state = FactState.READY;
      }
    }

    Object.assign(fact, updateFactDto);
    return this.factRepository.save(fact);
  }

  async remove(id: string, user: User): Promise<void> {
    const fact = await this.findOne(id, user);

    // Check access
    await this.checkProjectAccess(
      fact.corpus.projectId,
      user,
      ProjectRole.MAINTAINER,
    );

    await this.factRepository.remove(fact);
  }

  async addSupport(
    id: string,
    addSupportDto: AddSupportDto,
    user: User,
  ): Promise<Fact> {
    const fact = await this.findOne(id, user);
    const { supportFactId } = addSupportDto;

    // Check access
    await this.checkProjectAccess(
      fact.corpus.projectId,
      user,
      ProjectRole.CONTRIBUTOR,
    );

    // Get support fact
    const supportFact = await this.factRepository.findOne({
      where: { id: supportFactId },
      relations: ['corpus'],
    });

    if (!supportFact) {
      throw new NotFoundException('Support fact not found');
    }

    // Support fact must be in same corpus
    if (supportFact.corpusId !== fact.corpusId) {
      throw new BadRequestException(
        'Support fact must be in the same corpus',
      );
    }

    // Add support relationship
    if (!fact.supports) {
      fact.supports = [];
    }

    // Check if already supporting
    const alreadySupports = fact.supports.some(
      (s) => s.id === supportFactId,
    );

    if (!alreadySupports) {
      fact.supports.push(supportFact);
      await this.factRepository.save(fact);
    }

    return this.findOne(id, user);
  }

  async removeSupport(
    id: string,
    supportFactId: string,
    user: User,
  ): Promise<Fact> {
    const fact = await this.findOne(id, user);

    // Check access
    await this.checkProjectAccess(
      fact.corpus.projectId,
      user,
      ProjectRole.CONTRIBUTOR,
    );

    // Remove support relationship
    if (fact.supports) {
      fact.supports = fact.supports.filter((s) => s.id !== supportFactId);
      await this.factRepository.save(fact);
    }

    return this.findOne(id, user);
  }

  private async checkProjectAccess(
    projectId: string,
    user: User,
    requiredRole: ProjectRole,
  ): Promise<void> {
    // Application admins have full access
    if (user.applicationRole === ApplicationRole.ADMIN) {
      return;
    }

    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Project owner has full access
    if (project.ownerId === user.id) {
      return;
    }

    // Check project membership
    const member = await this.projectMemberRepository.findOne({
      where: { projectId, userId: user.id },
    });

    if (!member) {
      throw new ForbiddenException('Access denied to this project');
    }

    // Role hierarchy
    const roleHierarchy = {
      [ProjectRole.OWNER]: 5,
      [ProjectRole.ADMIN]: 4,
      [ProjectRole.MAINTAINER]: 3,
      [ProjectRole.CONTRIBUTOR]: 2,
      [ProjectRole.VIEWER]: 1,
    };

    if (roleHierarchy[member.role] < roleHierarchy[requiredRole]) {
      throw new ForbiddenException('Insufficient permissions for this action');
    }
  }
}
