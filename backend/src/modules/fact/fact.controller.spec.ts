import { Test, TestingModule } from '@nestjs/testing';
import { FactController } from './fact.controller';
import { FactService } from './fact.service';
import { RagSearchService } from '../../rag/rag-search.service';
import { RagEmbeddingService } from '../../rag/rag-embedding.service';
import { RagClientService } from '../../rag/rag-client.service';
import { CreateFactDto } from './dto/create-fact.dto';
import { User, ApplicationRole } from '../../entities/user.entity';
import {
  Fact,
  FactState,
  FactContext,
  EmbeddingStatus,
} from '../../entities/fact.entity';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('FactController', () => {
  let controller: FactController;
  let service: FactService;

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    password: 'hash',
    applicationRole: ApplicationRole.USER,
    createdAt: new Date(),
    updatedAt: new Date(),
    ownedProjects: [],
    projectMemberships: [],
  };

  const mockCorpus = {
    id: 'corpus-123',
    name: 'Test Corpus',
    projectId: 'project-123',
    basisCorpusId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockFact: Partial<Fact> = {
    id: 'fact-123',
    statement: 'Test fact statement',
    corpusId: 'corpus-123',
    corpus: mockCorpus as any,
    context: FactContext.CORPUS_KNOWLEDGE,
    basisId: undefined,
    basis: undefined,
    supports: [],
    supportedBy: [],
    dependentFacts: [],
    state: FactState.READY,
    meta: {},
    embeddingStatus: EmbeddingStatus.PENDING,
    lastEmbeddedAt: null,
    embeddingVersion: undefined,
    embeddingModel: undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockFactService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    findOneWithRelationships: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    addSupport: jest.fn(),
    removeSupport: jest.fn(),
  };

  const mockRagSearchService = {
    searchFactsByNaturalLanguage: jest.fn(),
    findSimilarFacts: jest.fn(),
  };

  const mockRagEmbeddingService = {
    processFactEmbedding: jest.fn(),
    getEmbeddingStats: jest.fn(),
    processPendingEmbeddings: jest.fn(),
  };

  const mockRagClientService = {
    isEnabled: jest.fn().mockReturnValue(false),
    healthCheck: jest.fn(),
    isError: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FactController],
      providers: [
        { provide: FactService, useValue: mockFactService },
        { provide: RagSearchService, useValue: mockRagSearchService },
        { provide: RagEmbeddingService, useValue: mockRagEmbeddingService },
        { provide: RagClientService, useValue: mockRagClientService },
      ],
    }).compile();

    controller = module.get<FactController>(FactController);
    service = module.get<FactService>(FactService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findOneWithRelationships', () => {
    it('should return a fact with all relationships', async () => {
      const mockFactWithRelationships = {
        ...mockFact,
        basis: {
          id: 'basis-fact-123',
          statement: 'Basis fact',
          corpusId: 'corpus-123',
          context: FactContext.CORPUS_KNOWLEDGE,
          basisId: undefined,
          state: FactState.READY,
          meta: {},
          embeddingStatus: EmbeddingStatus.EMBEDDED,
          lastEmbeddedAt: new Date(),
          embeddingVersion: '1.0',
          embeddingModel: 'text-embedding-3-small',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        supports: [
          {
            id: 'support-fact-123',
            statement: 'Supporting fact',
            corpusId: 'corpus-123',
            context: FactContext.CORPUS_KNOWLEDGE,
            state: FactState.READY,
          },
        ],
        supportedBy: [
          {
            id: 'supporter-fact-123',
            statement: 'Supporter fact',
            corpusId: 'corpus-123',
            context: FactContext.CORPUS_KNOWLEDGE,
            state: FactState.READY,
          },
        ],
        dependentFacts: [
          {
            id: 'dependent-fact-123',
            statement: 'Dependent fact',
            corpusId: 'corpus-123',
            basisId: 'fact-123',
            context: FactContext.CORPUS_KNOWLEDGE,
            state: FactState.READY,
          },
        ],
      } as any;

      mockFactService.findOneWithRelationships.mockResolvedValue(
        mockFactWithRelationships,
      );

      const result = await controller.findOneWithRelationships(
        'fact-123',
        mockUser,
      );

      expect(result).toEqual(mockFactWithRelationships);
      expect(service.findOneWithRelationships).toHaveBeenCalledWith(
        'fact-123',
        mockUser,
      );
      expect(result.basis).toBeDefined();
      expect(result.supports).toHaveLength(1);
      expect(result.supportedBy).toHaveLength(1);
      expect(result.dependentFacts).toHaveLength(1);
    });

    it('should return a fact with no relationships (nulls and empty arrays)', async () => {
      const mockFactNoRelationships = {
        ...mockFact,
        basis: undefined,
        supports: [],
        supportedBy: [],
        dependentFacts: [],
      } as any;

      mockFactService.findOneWithRelationships.mockResolvedValue(
        mockFactNoRelationships,
      );

      const result = await controller.findOneWithRelationships(
        'fact-123',
        mockUser,
      );

      expect(result).toEqual(mockFactNoRelationships);
      expect(result.basis).toBeUndefined();
      expect(result.supports).toEqual([]);
      expect(result.supportedBy).toEqual([]);
      expect(result.dependentFacts).toEqual([]);
    });

    it('should throw NotFoundException when fact does not exist', async () => {
      mockFactService.findOneWithRelationships.mockRejectedValue(
        new NotFoundException('Fact with ID fact-999 not found'),
      );

      await expect(
        controller.findOneWithRelationships('fact-999', mockUser),
      ).rejects.toThrow(NotFoundException);

      expect(service.findOneWithRelationships).toHaveBeenCalledWith(
        'fact-999',
        mockUser,
      );
    });

    it('should throw ForbiddenException when user lacks access', async () => {
      mockFactService.findOneWithRelationships.mockRejectedValue(
        new ForbiddenException('Access denied to this project'),
      );

      await expect(
        controller.findOneWithRelationships('fact-123', mockUser),
      ).rejects.toThrow(ForbiddenException);

      expect(service.findOneWithRelationships).toHaveBeenCalledWith(
        'fact-123',
        mockUser,
      );
    });
  });

  describe('create with supportedById', () => {
    it('should create a fact with supportedById relationship', async () => {
      const createDto: CreateFactDto = {
        statement: 'New supporting fact',
        corpusId: 'corpus-123',
        context: FactContext.CORPUS_KNOWLEDGE,
        supportedById: 'target-fact-123',
      };

      const targetFact = {
        id: 'target-fact-123',
        statement: 'Target fact',
        corpusId: 'corpus-123',
        corpus: mockCorpus as any,
        context: FactContext.CORPUS_KNOWLEDGE,
        basisId: undefined,
        basis: undefined,
        supports: [],
        supportedBy: [],
        dependentFacts: [],
        state: FactState.READY,
        meta: {},
        embeddingStatus: EmbeddingStatus.EMBEDDED,
        lastEmbeddedAt: new Date(),
        embeddingVersion: '1.0',
        embeddingModel: 'text-embedding-3-small',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any;

      const createdFact = {
        ...mockFact,
        id: 'new-fact-123',
        statement: 'New supporting fact',
        supportedBy: [targetFact],
      } as any;

      mockFactService.create.mockResolvedValue(createdFact);

      const result = await controller.create(createDto, mockUser);

      expect(result).toEqual(createdFact);
      expect(service.create).toHaveBeenCalledWith(createDto, mockUser);
      expect(result.supportedBy).toContainEqual(targetFact);
    });

    it('should create a fact without supportedById (normal creation)', async () => {
      const createDto: CreateFactDto = {
        statement: 'New fact without support',
        corpusId: 'corpus-123',
        context: FactContext.CORPUS_KNOWLEDGE,
      };

      const createdFact = {
        ...mockFact,
        id: 'new-fact-456',
        statement: 'New fact without support',
        supportedBy: [],
      } as any;

      mockFactService.create.mockResolvedValue(createdFact);

      const result = await controller.create(createDto, mockUser);

      expect(result).toEqual(createdFact);
      expect(service.create).toHaveBeenCalledWith(createDto, mockUser);
      expect(result.supportedBy).toEqual([]);
    });

    it('should throw NotFoundException when target fact does not exist', async () => {
      const createDto: CreateFactDto = {
        statement: 'New supporting fact',
        corpusId: 'corpus-123',
        supportedById: 'non-existent-fact',
      };

      mockFactService.create.mockRejectedValue(
        new NotFoundException('Target fact to support not found'),
      );

      await expect(controller.create(createDto, mockUser)).rejects.toThrow(
        NotFoundException,
      );

      expect(service.create).toHaveBeenCalledWith(createDto, mockUser);
    });

    it('should reject supportedById if target fact is in different corpus', async () => {
      const createDto: CreateFactDto = {
        statement: 'New supporting fact',
        corpusId: 'corpus-123',
        supportedById: 'other-corpus-fact',
      };

      mockFactService.create.mockRejectedValue(
        new Error(
          'Cannot create support relationship: target fact must be in the same corpus',
        ),
      );

      await expect(controller.create(createDto, mockUser)).rejects.toThrow(
        'Cannot create support relationship: target fact must be in the same corpus',
      );

      expect(service.create).toHaveBeenCalledWith(createDto, mockUser);
    });

    it('should reject supportedById if contexts do not match', async () => {
      const createDto: CreateFactDto = {
        statement: 'New supporting fact',
        corpusId: 'corpus-123',
        context: FactContext.CORPUS_KNOWLEDGE,
        supportedById: 'global-fact-123',
      };

      mockFactService.create.mockRejectedValue(
        new Error(
          'Cannot create support relationship between different contexts: corpus_knowledge and corpus_global',
        ),
      );

      await expect(controller.create(createDto, mockUser)).rejects.toThrow(
        'Cannot create support relationship between different contexts',
      );

      expect(service.create).toHaveBeenCalledWith(createDto, mockUser);
    });
  });

  describe('findOne (existing endpoint)', () => {
    it('should return a fact by ID', async () => {
      mockFactService.findOne.mockResolvedValue(mockFact);

      const result = await controller.findOne('fact-123', mockUser);

      expect(result).toEqual(mockFact);
      expect(service.findOne).toHaveBeenCalledWith('fact-123', mockUser);
    });

    it('should throw NotFoundException when fact does not exist', async () => {
      mockFactService.findOne.mockRejectedValue(
        new NotFoundException('Fact with ID fact-999 not found'),
      );

      await expect(controller.findOne('fact-999', mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll (existing endpoint)', () => {
    it('should return paginated facts', async () => {
      const paginatedResult = {
        data: [mockFact],
        total: 1,
        page: 1,
        limit: 10,
      };

      mockFactService.findAll.mockResolvedValue(paginatedResult);

      const result = await controller.findAll(mockUser, undefined, 1, 10);

      expect(result).toEqual(paginatedResult);
      expect(service.findAll).toHaveBeenCalledWith(mockUser, undefined, 1, 10);
    });
  });
});
