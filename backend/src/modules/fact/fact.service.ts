import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Fact, FactState, FactContext } from '../../entities/fact.entity';
import { Corpus } from '../../entities/corpus.entity';
import { Project } from '../../entities/project.entity';
import {
  ProjectMember,
  ProjectRole,
} from '../../entities/project-member.entity';
import { User, ApplicationRole } from '../../entities/user.entity';
import { CreateFactDto } from './dto/create-fact.dto';
import { UpdateFactDto } from './dto/update-fact.dto';
import { AddSupportDto } from './dto/add-support.dto';
import { LinkFactsDto } from './dto/link-facts.dto';
import { RagEmbeddingService } from '../../rag/rag-embedding.service';

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
    private readonly ragEmbeddingService: RagEmbeddingService,
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
      .leftJoinAndSelect('fact.linkedFacts', 'linkedFacts')
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

      await this.checkProjectAccess(corpus.projectId, user, ProjectRole.VIEWER);
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
      relations: [
        'corpus',
        'corpus.project',
        'basis',
        'linkedFacts',
      ],
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

  /**
   * Find fact with complete relationship context for detailed view
   * Loads: basis, linkedFacts, dependentFacts, corpus, basisChain
   */
  async findOneWithRelationships(id: string, user: User): Promise<Fact> {
    const fact = await this.factRepository.findOne({
      where: { id },
      relations: [
        'corpus',
        'corpus.project',
        'basis',
        'linkedFacts',
      ],
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

    // Load dependent facts (facts that have this fact as their basis)
    const dependentFacts = await this.findDependentFacts(id);

    // Load complete basis chain from root to current fact
    const basisChain = await this.loadBasisChain(id);

    // Attach virtual properties to the result
    (fact as any).dependentFacts = dependentFacts;
    (fact as any).basisChain = basisChain;

    return fact;
  }

  /**
   * Load the complete chain of basis facts from root to the specified fact
   * Returns array ordered from root (first) to immediate parent (last)
   * Does NOT include the specified fact itself
   *
   * Safeguards:
   * - Maximum depth of 50 levels
   * - Circular reference detection
   * - Minimal data loading (id, statement, context, corpusId)
   */
  private async loadBasisChain(factId: string): Promise<Partial<Fact>[]> {
    const MAX_DEPTH = 50;
    const visited = new Set<string>();
    const chain: Partial<Fact>[] = [];

    // Start with the immediate basis of the requested fact
    const startFact = await this.factRepository.findOne({
      where: { id: factId },
      select: ['id', 'basisId'],
    });

    if (!startFact || !startFact.basisId) {
      // No basis, return empty chain
      return [];
    }

    let currentBasisId: string | null = startFact.basisId;
    let depth = 0;

    // Traverse up the basis chain iteratively
    while (currentBasisId && depth < MAX_DEPTH) {
      // Check for circular reference
      if (visited.has(currentBasisId)) {
        // Circular reference detected, stop traversal
        break;
      }

      visited.add(currentBasisId);

      // Load the basis fact with minimal data
      const basisFact = await this.factRepository.findOne({
        where: { id: currentBasisId },
        select: ['id', 'statement', 'state', 'context', 'corpusId', 'basisId'],
        relations: ['corpus'],
      });

      if (!basisFact) {
        // Basis fact not found, stop traversal
        break;
      }

      // Add to chain (will reverse later to get root-first order)
      chain.push({
        id: basisFact.id,
        statement: basisFact.statement,
        state: basisFact.state,
        context: basisFact.context,
        corpusId: basisFact.corpusId,
        corpus: basisFact.corpus,
      });

      // Move to next basis
      currentBasisId = basisFact.basisId;
      depth++;
    }

    // Reverse the chain so root is first, immediate parent is last
    return chain.reverse();
  }

  /**
   * Find all facts that have the specified fact as their basis
   * Returns facts ordered by creation date (newest first)
   */
  async findDependentFacts(basisId: string): Promise<Fact[]> {
    return this.factRepository.find({
      where: { basisId },
      relations: ['corpus'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByContext(
    corpusId: string,
    context: FactContext,
    user: User,
  ): Promise<Fact[]> {
    // Get corpus and check access
    const corpus = await this.corpusRepository.findOne({
      where: { id: corpusId },
      relations: ['project'],
    });

    if (!corpus) {
      throw new NotFoundException('Corpus not found');
    }

    await this.checkProjectAccess(corpus.projectId, user, ProjectRole.VIEWER);

    // Find facts by context
    return this.factRepository.find({
      where: { corpusId, context },
      relations: ['basis', 'linkedFacts'],
      order: { createdAt: 'DESC' },
    });
  }

  async create(createFactDto: CreateFactDto, user: User): Promise<Fact> {
    const {
      corpusId,
      basisId,
      statement,
      state,
      meta,
      context,
      supportedById,
    } = createFactDto;

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

    // Default context to CORPUS_KNOWLEDGE if not provided
    const factContext = context || FactContext.CORPUS_KNOWLEDGE;

    // Validate context-specific basis constraints
    await this.validateContextBasisConstraints(factContext, basisId);

    // Validate basis if provided
    if (basisId) {
      const basisFact = await this.factRepository.findOne({
        where: { id: basisId },
        relations: ['corpus'],
      });

      if (!basisFact) {
        throw new NotFoundException('Basis fact not found');
      }

      // If context is CORPUS_KNOWLEDGE, validate basis fact context
      if (factContext === FactContext.CORPUS_KNOWLEDGE) {
        if (basisFact.context !== FactContext.CORPUS_KNOWLEDGE) {
          throw new BadRequestException(
            `Cannot set basis from context '${basisFact.context}' for a fact with context 'corpus_knowledge'. ` +
              'Basis fact must also have context=corpus_knowledge.',
          );
        }
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
      context: factContext,
      state: factState,
      meta,
    });

    const savedFact = await this.factRepository.save(fact);

    // If supportedById is provided, create the bidirectional link relationship
    if (supportedById) {
      const targetFact = await this.factRepository.findOne({
        where: { id: supportedById },
        relations: ['corpus', 'linkedFacts'],
      });

      if (!targetFact) {
        throw new NotFoundException('Target fact to link not found');
      }

      // Validate target fact is in same corpus
      if (targetFact.corpusId !== corpusId) {
        throw new BadRequestException(
          'Cannot create link relationship: target fact must be in the same corpus',
        );
      }

      // Validate both facts have the same context
      if (targetFact.context !== factContext) {
        throw new BadRequestException(
          `Cannot create link relationship between different contexts: ${factContext} and ${targetFact.context}`,
        );
      }

      // Add the new fact to the target fact's linked facts (bidirectional)
      if (!targetFact.linkedFacts) {
        targetFact.linkedFacts = [];
      }
      targetFact.linkedFacts.push(savedFact);
      await this.factRepository.save(targetFact);
    }

    // Trigger embedding asynchronously (fire-and-forget)
    // Only if fact has a statement
    if (savedFact.statement && savedFact.statement.trim() !== '') {
      this.ragEmbeddingService.processFactEmbedding(savedFact.id);
    }

    // Reload fact with relationships if linked to another fact
    if (supportedById) {
      return this.findOne(savedFact.id, user);
    }

    return savedFact;
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

    // Determine target context (use new context if provided, otherwise keep existing)
    const targetContext = updateFactDto.context || fact.context;

    // If context is being changed
    if (updateFactDto.context && updateFactDto.context !== fact.context) {
      // If changing TO corpus_global or corpus_builder, must clear basisId
      if (
        (updateFactDto.context === FactContext.CORPUS_GLOBAL ||
          updateFactDto.context === FactContext.CORPUS_BUILDER) &&
        fact.basisId
      ) {
        // Auto-clear basisId when changing to context that doesn't allow basis
        updateFactDto.basisId = void 0;
      }
    }

    // Validate context-specific basis constraints for target context
    const targetBasisId =
      updateFactDto.basisId !== undefined
        ? updateFactDto.basisId
        : fact.basisId;
    await this.validateContextBasisConstraints(targetContext, targetBasisId);

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

        // If target context is CORPUS_KNOWLEDGE, validate basis fact context
        if (targetContext === FactContext.CORPUS_KNOWLEDGE) {
          if (basisFact.context !== FactContext.CORPUS_KNOWLEDGE) {
            throw new BadRequestException(
              `Cannot set basis from context '${basisFact.context}' for a fact with context 'corpus_knowledge'. ` +
                'Basis fact must also have context=corpus_knowledge.',
            );
          }
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

    // Track if statement changed for embedding
    const statementChanged =
      updateFactDto.statement !== undefined &&
      updateFactDto.statement !== fact.statement;

    Object.assign(fact, updateFactDto);
    await this.factRepository.save(fact);

    // Trigger embedding asynchronously if statement changed and has content
    if (statementChanged && fact.statement && fact.statement.trim() !== '') {
      this.ragEmbeddingService.processFactEmbedding(fact.id);
    }

    // Reload the fact with all relations to ensure frontend gets complete data
    return this.findOne(id, user);
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

    // Cleanup embedding in RAG service
    this.ragEmbeddingService.deleteFactEmbedding(id);
  }

  /**
   * Create a bidirectional link relationship between two facts
   * Both facts must be in the same corpus and have the same context
   */
  async linkFacts(
    id: string,
    linkFactsDto: LinkFactsDto | AddSupportDto,
    user: User,
  ): Promise<Fact> {
    const fact = await this.findOne(id, user);
    // Support both old and new DTO property names
    const linkedFactId =
      'linkedFactId' in linkFactsDto
        ? linkFactsDto.linkedFactId
        : linkFactsDto.supportFactId;

    // Check access
    await this.checkProjectAccess(
      fact.corpus.projectId,
      user,
      ProjectRole.CONTRIBUTOR,
    );

    // Get the fact to link
    const linkedFact = await this.factRepository.findOne({
      where: { id: linkedFactId },
      relations: ['corpus'],
    });

    if (!linkedFact) {
      throw new NotFoundException('Fact to link not found');
    }

    // Linked fact must be in same corpus
    if (linkedFact.corpusId !== fact.corpusId) {
      throw new BadRequestException('Linked fact must be in the same corpus');
    }

    // Validate both facts have the SAME context
    if (fact.context !== linkedFact.context) {
      throw new BadRequestException(
        `Cannot create link relationship between different contexts: ${fact.context} and ${linkedFact.context}`,
      );
    }

    // Add bidirectional link relationship
    if (!fact.linkedFacts) {
      fact.linkedFacts = [];
    }

    // Check if already linked
    const alreadyLinked = fact.linkedFacts.some((f) => f.id === linkedFactId);

    if (!alreadyLinked) {
      fact.linkedFacts.push(linkedFact);
      await this.factRepository.save(fact);
    }

    return this.findOne(id, user);
  }

  /**
   * Remove a bidirectional link relationship between two facts
   */
  async unlinkFacts(
    id: string,
    linkedFactId: string,
    user: User,
  ): Promise<Fact> {
    const fact = await this.findOne(id, user);

    // Check access
    await this.checkProjectAccess(
      fact.corpus.projectId,
      user,
      ProjectRole.CONTRIBUTOR,
    );

    // Remove bidirectional link relationship
    if (fact.linkedFacts) {
      fact.linkedFacts = fact.linkedFacts.filter((f) => f.id !== linkedFactId);
      await this.factRepository.save(fact);
    }

    return this.findOne(id, user);
  }

  // Deprecated: Use linkFacts instead
  async addSupport(
    id: string,
    addSupportDto: AddSupportDto,
    user: User,
  ): Promise<Fact> {
    return this.linkFacts(id, addSupportDto, user);
  }

  // Deprecated: Use unlinkFacts instead
  async removeSupport(
    id: string,
    supportFactId: string,
    user: User,
  ): Promise<Fact> {
    return this.unlinkFacts(id, supportFactId, user);
  }

  /**
   * Validate context-specific basis constraints
   * - CORPUS_GLOBAL and CORPUS_BUILDER cannot have a basis
   * - CORPUS_KNOWLEDGE can have a basis
   */
  private async validateContextBasisConstraints(
    context: FactContext,
    basisId: string | null | undefined,
  ): Promise<void> {
    // If no basisId provided, validation passes
    if (!basisId) {
      return;
    }

    // If context is CORPUS_GLOBAL or CORPUS_BUILDER, reject basisId
    if (context === FactContext.CORPUS_GLOBAL) {
      throw new BadRequestException(
        'Facts with context=corpus_global cannot have a basis. ' +
          'Global facts are foundational and must be independent.',
      );
    }

    if (context === FactContext.CORPUS_BUILDER) {
      throw new BadRequestException(
        'Facts with context=corpus_builder cannot have a basis. ' +
          'Builder facts define generation rules and must be independent.',
      );
    }

    // CORPUS_KNOWLEDGE can have a basis (validation passes)
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
