import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Corpus } from '../../entities/corpus.entity';
import { Project } from '../../entities/project.entity';
import { ProjectMember, ProjectRole } from '../../entities/project-member.entity';
import { User, ApplicationRole } from '../../entities/user.entity';
import { CreateCorpusDto } from './dto/create-corpus.dto';
import { UpdateCorpusDto } from './dto/update-corpus.dto';

@Injectable()
export class CorpusService {
  constructor(
    @InjectRepository(Corpus)
    private readonly corpusRepository: Repository<Corpus>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(ProjectMember)
    private readonly projectMemberRepository: Repository<ProjectMember>,
  ) {}

  async findAll(
    user: User,
    projectId?: string,
    page = 1,
    limit = 10,
  ): Promise<{ data: Corpus[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;

    const queryBuilder = this.corpusRepository
      .createQueryBuilder('corpus')
      .leftJoinAndSelect('corpus.project', 'project')
      .leftJoinAndSelect('corpus.basisCorpus', 'basisCorpus')
      .skip(skip)
      .take(limit)
      .orderBy('corpus.createdAt', 'DESC');

    if (projectId) {
      // Check access to project
      await this.checkProjectAccess(projectId, user, ProjectRole.VIEWER);
      queryBuilder.where('corpus.projectId = :projectId', { projectId });
    } else {
      // Filter by accessible projects
      if (user.applicationRole !== ApplicationRole.ADMIN) {
        queryBuilder
          .leftJoin('project.members', 'member')
          .where('project.ownerId = :userId', { userId: user.id })
          .orWhere('member.userId = :userId', { userId: user.id });
      }
    }

    const [data, total] = await queryBuilder.getManyAndCount();

    return { data, total, page, limit };
  }

  async findOne(id: string, user: User): Promise<Corpus> {
    const corpus = await this.corpusRepository.findOne({
      where: { id },
      relations: ['project', 'basisCorpus'],
    });

    if (!corpus) {
      throw new NotFoundException(`Corpus with ID ${id} not found`);
    }

    // Check access
    await this.checkProjectAccess(corpus.projectId, user, ProjectRole.VIEWER);

    return corpus;
  }

  async create(createCorpusDto: CreateCorpusDto, user: User): Promise<Corpus> {
    const { projectId, basisCorpusId, ...corpusData } = createCorpusDto;

    // Check project access (at least CONTRIBUTOR)
    await this.checkProjectAccess(projectId, user, ProjectRole.CONTRIBUTOR);

    // Verify project exists
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Validate basis corpus if provided
    if (basisCorpusId) {
      const basisCorpus = await this.corpusRepository.findOne({
        where: { id: basisCorpusId },
      });

      if (!basisCorpus) {
        throw new NotFoundException('Basis corpus not found');
      }

      // Basis corpus must be in the same project
      if (basisCorpus.projectId !== projectId) {
        throw new BadRequestException(
          'Basis corpus must be in the same project',
        );
      }
    }

    const corpus = this.corpusRepository.create({
      ...corpusData,
      projectId,
      basisCorpusId,
    });

    return this.corpusRepository.save(corpus);
  }

  async update(
    id: string,
    updateCorpusDto: UpdateCorpusDto,
    user: User,
  ): Promise<Corpus> {
    const corpus = await this.findOne(id, user);

    // Check access (at least CONTRIBUTOR)
    await this.checkProjectAccess(
      corpus.projectId,
      user,
      ProjectRole.CONTRIBUTOR,
    );

    // Validate basis corpus if being updated
    if (updateCorpusDto.basisCorpusId) {
      const basisCorpus = await this.corpusRepository.findOne({
        where: { id: updateCorpusDto.basisCorpusId },
      });

      if (!basisCorpus) {
        throw new NotFoundException('Basis corpus not found');
      }

      // Basis corpus must be in the same project
      if (basisCorpus.projectId !== corpus.projectId) {
        throw new BadRequestException(
          'Basis corpus must be in the same project',
        );
      }
    }

    Object.assign(corpus, updateCorpusDto);
    return this.corpusRepository.save(corpus);
  }

  async remove(id: string, user: User): Promise<void> {
    const corpus = await this.findOne(id, user);

    // Check access (at least MAINTAINER)
    await this.checkProjectAccess(
      corpus.projectId,
      user,
      ProjectRole.MAINTAINER,
    );

    await this.corpusRepository.remove(corpus);
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
