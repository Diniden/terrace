import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { FactService } from './fact.service';
import { Fact, FactState, FactContext } from '../../entities/fact.entity';
import { Corpus } from '../../entities/corpus.entity';
import { Project } from '../../entities/project.entity';
import {
  ProjectMember,
  ProjectRole,
} from '../../entities/project-member.entity';
import { User, ApplicationRole } from '../../entities/user.entity';
import { RagEmbeddingService } from '../../rag/rag-embedding.service';
import { CreateFactDto } from './dto/create-fact.dto';

describe('FactService', () => {
  let service: FactService;
  let factRepository: jest.Mocked<Repository<Fact>>;
  let corpusRepository: jest.Mocked<Repository<Corpus>>;
  let projectRepository: jest.Mocked<Repository<Project>>;
  let projectMemberRepository: jest.Mocked<Repository<ProjectMember>>;
  let ragEmbeddingService: jest.Mocked<RagEmbeddingService>;

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    applicationRole: ApplicationRole.USER,
  } as User;

  const mockAdminUser: User = {
    id: 'admin-123',
    email: 'admin@example.com',
    applicationRole: ApplicationRole.ADMIN,
  } as User;

  const mockProject: Project = {
    id: 'project-123',
    name: 'Test Project',
    ownerId: 'user-123',
  } as Project;

  const mockCorpus: Corpus = {
    id: 'corpus-123',
    name: 'Test Corpus',
    projectId: 'project-123',
    project: mockProject,
  } as Corpus;

  const mockFact = {
    id: 'fact-123',
    statement: 'Test statement',
    corpusId: 'corpus-123',
    corpus: mockCorpus,
    context: FactContext.CORPUS_KNOWLEDGE,
    state: FactState.READY,
    basis: undefined,
    basisId: undefined,
    linkedFacts: [],
  } as any as Fact;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FactService,
        {
          provide: getRepositoryToken(Fact),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Corpus),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Project),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ProjectMember),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: RagEmbeddingService,
          useValue: {
            processFactEmbedding: jest.fn(),
            deleteFactEmbedding: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<FactService>(FactService);
    factRepository = module.get(getRepositoryToken(Fact));
    corpusRepository = module.get(getRepositoryToken(Corpus));
    projectRepository = module.get(getRepositoryToken(Project));
    projectMemberRepository = module.get(getRepositoryToken(ProjectMember));
    ragEmbeddingService = module.get(RagEmbeddingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOneWithRelationships', () => {
    it('should load fact with all relationships including dependent facts', async () => {
      const dependentFact1: Fact = {
        id: 'dependent-1',
        statement: 'Dependent fact 1',
        corpusId: 'corpus-123',
        basisId: 'fact-123',
        context: FactContext.CORPUS_KNOWLEDGE,
        corpus: mockCorpus,
      } as Fact;

      const dependentFact2: Fact = {
        id: 'dependent-2',
        statement: 'Dependent fact 2',
        corpusId: 'corpus-123',
        basisId: 'fact-123',
        context: FactContext.CORPUS_KNOWLEDGE,
        corpus: mockCorpus,
      } as Fact;

      const factWithRelations = {
        ...mockFact,
        basis: null,
        linkedFacts: [],
      };

      factRepository.findOne.mockResolvedValueOnce(factWithRelations as any);
      factRepository.find.mockResolvedValueOnce([
        dependentFact1,
        dependentFact2,
      ]);
      projectRepository.findOne.mockResolvedValue(mockProject);

      const result = await service.findOneWithRelationships(
        'fact-123',
        mockAdminUser,
      );

      expect(factRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'fact-123' },
        relations: [
          'corpus',
          'corpus.project',
          'basis',
          'linkedFacts',
        ],
      });

      expect(factRepository.find).toHaveBeenCalledWith({
        where: { basisId: 'fact-123' },
        relations: ['corpus'],
        order: { createdAt: 'DESC' },
      });

      expect((result as any).dependentFacts).toEqual([
        dependentFact1,
        dependentFact2,
      ]);
    });

    it('should throw NotFoundException when fact does not exist', async () => {
      factRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findOneWithRelationships('nonexistent', mockAdminUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('should check project access for non-admin users', async () => {
      const factWithRelations = { ...mockFact };
      factRepository.findOne.mockResolvedValue(factWithRelations as Fact);
      factRepository.find.mockResolvedValue([]);
      projectRepository.findOne.mockResolvedValue(mockProject);

      await service.findOneWithRelationships('fact-123', mockUser);

      expect(projectRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'project-123' },
      });
    });

    it('should throw ForbiddenException when user lacks access', async () => {
      const unauthorizedUser: User = {
        id: 'other-user',
        email: 'other@example.com',
        applicationRole: ApplicationRole.USER,
      } as User;

      const otherProject: Project = {
        id: 'project-123',
        name: 'Test Project',
        ownerId: 'user-123',
      } as Project;

      factRepository.findOne.mockResolvedValue(mockFact);
      projectRepository.findOne.mockResolvedValue(otherProject);
      projectMemberRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findOneWithRelationships('fact-123', unauthorizedUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findDependentFacts', () => {
    it('should find all facts with matching basisId', async () => {
      const dependent1 = {
        id: 'dep-1',
        basisId: 'fact-123',
        statement: 'Dependent 1',
        corpus: mockCorpus,
      } as Fact;

      const dependent2 = {
        id: 'dep-2',
        basisId: 'fact-123',
        statement: 'Dependent 2',
        corpus: mockCorpus,
      } as Fact;

      factRepository.find.mockResolvedValue([dependent1, dependent2]);

      const result = await service.findDependentFacts('fact-123');

      expect(factRepository.find).toHaveBeenCalledWith({
        where: { basisId: 'fact-123' },
        relations: ['corpus'],
        order: { createdAt: 'DESC' },
      });

      expect(result).toEqual([dependent1, dependent2]);
    });

    it('should return empty array when no dependent facts exist', async () => {
      factRepository.find.mockResolvedValue([]);

      const result = await service.findDependentFacts('fact-123');

      expect(result).toEqual([]);
    });

    it('should order dependent facts by creation date descending', async () => {
      factRepository.find.mockResolvedValue([]);

      await service.findDependentFacts('fact-123');

      expect(factRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          order: { createdAt: 'DESC' },
        }),
      );
    });
  });

  describe('create with supportedById', () => {
    it('should create fact and establish link relationship when supportedById is provided', async () => {
      const targetFact = {
        id: 'target-fact',
        statement: 'Target fact',
        corpusId: 'corpus-123',
        corpus: mockCorpus,
        context: FactContext.CORPUS_KNOWLEDGE,
        linkedFacts: [],
      } as any as Fact;

      const createDto: CreateFactDto = {
        corpusId: 'corpus-123',
        statement: 'New supporting fact',
        context: FactContext.CORPUS_KNOWLEDGE,
        supportedById: 'target-fact',
      };

      const createdFact: Fact = {
        id: 'new-fact',
        statement: 'New supporting fact',
        corpusId: 'corpus-123',
        context: FactContext.CORPUS_KNOWLEDGE,
        state: FactState.READY,
      } as Fact;

      corpusRepository.findOne.mockResolvedValue(mockCorpus);
      projectRepository.findOne.mockResolvedValue(mockProject);
      factRepository.create.mockReturnValue(createdFact);
      factRepository.save.mockResolvedValueOnce(createdFact);

      const reloadedCreatedFact = {
        ...createdFact,
        corpus: mockCorpus,
        linkedFacts: [targetFact],
      } as any;

      factRepository.findOne
        .mockResolvedValueOnce(targetFact)
        .mockResolvedValueOnce(reloadedCreatedFact);

      const result = await service.create(createDto, mockAdminUser);

      expect(factRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          linkedFacts: expect.arrayContaining([createdFact]),
        }),
      );

      expect(ragEmbeddingService.processFactEmbedding).toHaveBeenCalledWith(
        'new-fact',
      );
    });

    it('should validate target fact is in same corpus', async () => {
      const targetFact: Fact = {
        id: 'target-fact',
        corpusId: 'different-corpus',
        corpus: { id: 'different-corpus' } as Corpus,
        context: FactContext.CORPUS_KNOWLEDGE,
      } as Fact;

      const createDto: CreateFactDto = {
        corpusId: 'corpus-123',
        statement: 'New fact',
        supportedById: 'target-fact',
      };

      const createdFact = {
        id: 'new-fact',
        corpusId: 'corpus-123',
      } as Fact;

      corpusRepository.findOne.mockResolvedValue(mockCorpus);
      projectRepository.findOne.mockResolvedValue(mockProject);
      factRepository.create.mockReturnValue(createdFact);
      factRepository.save.mockResolvedValue(createdFact);
      factRepository.findOne.mockResolvedValue(targetFact);

      await expect(service.create(createDto, mockAdminUser)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should validate both facts have same context', async () => {
      const targetFact: Fact = {
        id: 'target-fact',
        corpusId: 'corpus-123',
        corpus: mockCorpus,
        context: FactContext.CORPUS_GLOBAL,
      } as Fact;

      const createDto: CreateFactDto = {
        corpusId: 'corpus-123',
        statement: 'New fact',
        context: FactContext.CORPUS_KNOWLEDGE,
        supportedById: 'target-fact',
      };

      const createdFact = {
        id: 'new-fact',
        corpusId: 'corpus-123',
        context: FactContext.CORPUS_KNOWLEDGE,
      } as Fact;

      corpusRepository.findOne.mockResolvedValue(mockCorpus);
      projectRepository.findOne.mockResolvedValue(mockProject);
      factRepository.create.mockReturnValue(createdFact);
      factRepository.save.mockResolvedValue(createdFact);
      factRepository.findOne.mockResolvedValue(targetFact);

      await expect(service.create(createDto, mockAdminUser)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when target fact does not exist', async () => {
      const createDto: CreateFactDto = {
        corpusId: 'corpus-123',
        statement: 'New fact',
        supportedById: 'nonexistent-fact',
      };

      const createdFact = {
        id: 'new-fact',
        corpusId: 'corpus-123',
      } as Fact;

      corpusRepository.findOne.mockResolvedValue(mockCorpus);
      projectRepository.findOne.mockResolvedValue(mockProject);
      factRepository.create.mockReturnValue(createdFact);
      factRepository.save.mockResolvedValue(createdFact);
      factRepository.findOne.mockResolvedValue(null);

      await expect(service.create(createDto, mockAdminUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should reload fact with relationships after establishing link', async () => {
      const targetFact = {
        id: 'target-fact',
        corpusId: 'corpus-123',
        corpus: mockCorpus,
        context: FactContext.CORPUS_KNOWLEDGE,
        linkedFacts: [],
      } as any as Fact;

      const createDto: CreateFactDto = {
        corpusId: 'corpus-123',
        statement: 'New fact',
        context: FactContext.CORPUS_KNOWLEDGE,
        supportedById: 'target-fact',
      };

      const createdFact = {
        id: 'new-fact',
        corpusId: 'corpus-123',
        context: FactContext.CORPUS_KNOWLEDGE,
        statement: 'New fact',
        state: FactState.READY,
      } as Fact;

      const reloadedFact = {
        ...createdFact,
        linkedFacts: [targetFact],
        corpus: mockCorpus,
      } as Fact;

      corpusRepository.findOne.mockResolvedValue(mockCorpus);
      projectRepository.findOne.mockResolvedValue(mockProject);
      factRepository.create.mockReturnValue(createdFact);
      factRepository.save.mockResolvedValueOnce(createdFact);
      factRepository.findOne
        .mockResolvedValueOnce(targetFact)
        .mockResolvedValueOnce(reloadedFact);

      const result = await service.create(createDto, mockAdminUser);

      // Should call findOne to reload the fact
      expect(factRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'new-fact' },
        relations: [
          'corpus',
          'corpus.project',
          'basis',
          'linkedFacts',
        ],
      });
    });
  });

  describe('create fact with basis from parent corpus', () => {
    it('should create fact in child corpus with basis from parent corpus', async () => {
      const parentCorpus = {
        id: 'parent-corpus',
        name: 'Parent Corpus',
        projectId: 'project-123',
        project: mockProject,
        basisCorpusId: null,
      } as any as Corpus;

      const childCorpus = {
        id: 'child-corpus',
        name: 'Child Corpus',
        projectId: 'project-123',
        project: mockProject,
        basisCorpusId: 'parent-corpus',
      } as any as Corpus;

      const basisFact: Fact = {
        id: 'basis-fact',
        statement: 'Basis fact in parent corpus',
        corpusId: 'parent-corpus',
        corpus: parentCorpus,
        context: FactContext.CORPUS_KNOWLEDGE,
        state: FactState.READY,
      } as Fact;

      const createDto: CreateFactDto = {
        corpusId: 'child-corpus',
        statement: 'Derived fact',
        context: FactContext.CORPUS_KNOWLEDGE,
        basisId: 'basis-fact',
        state: FactState.CLARIFY,
      };

      const createdFact: Fact = {
        id: 'derived-fact',
        statement: 'Derived fact',
        corpusId: 'child-corpus',
        basisId: 'basis-fact',
        context: FactContext.CORPUS_KNOWLEDGE,
        state: FactState.CLARIFY,
      } as Fact;

      corpusRepository.findOne.mockResolvedValue(childCorpus);
      projectRepository.findOne.mockResolvedValue(mockProject);
      factRepository.findOne.mockResolvedValue(basisFact);
      factRepository.create.mockReturnValue(createdFact);
      factRepository.save.mockResolvedValue(createdFact);

      const result = await service.create(createDto, mockAdminUser);

      expect(factRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          statement: 'Derived fact',
          corpusId: 'child-corpus',
          basisId: 'basis-fact',
          context: FactContext.CORPUS_KNOWLEDGE,
          state: FactState.CLARIFY,
        }),
      );

      expect(factRepository.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should reject fact with basis from different corpus (not parent)', async () => {
      const differentCorpus = {
        id: 'different-corpus',
        name: 'Different Corpus',
        projectId: 'project-123',
        basisCorpusId: null,
      } as any as Corpus;

      const childCorpus = {
        id: 'child-corpus',
        name: 'Child Corpus',
        projectId: 'project-123',
        basisCorpusId: 'parent-corpus',
      } as any as Corpus;

      const basisFact: Fact = {
        id: 'basis-fact',
        statement: 'Basis fact in different corpus',
        corpusId: 'different-corpus',
        corpus: differentCorpus,
        context: FactContext.CORPUS_KNOWLEDGE,
      } as Fact;

      const createDto: CreateFactDto = {
        corpusId: 'child-corpus',
        statement: 'Derived fact',
        context: FactContext.CORPUS_KNOWLEDGE,
        basisId: 'basis-fact',
      };

      corpusRepository.findOne.mockResolvedValue(childCorpus);
      projectRepository.findOne.mockResolvedValue(mockProject);
      factRepository.findOne.mockResolvedValue(basisFact);

      await expect(service.create(createDto, mockAdminUser)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('authorization', () => {
    it('should allow admin users to access any fact', async () => {
      factRepository.findOne.mockResolvedValue(mockFact);
      factRepository.find.mockResolvedValue([]);

      await service.findOneWithRelationships('fact-123', mockAdminUser);

      // Admin should bypass project member checks
      expect(projectMemberRepository.findOne).not.toHaveBeenCalled();
    });

    it('should allow project owner to access facts', async () => {
      const ownerUser: User = {
        id: 'user-123',
        email: 'owner@example.com',
        applicationRole: ApplicationRole.USER,
      } as User;

      factRepository.findOne.mockResolvedValue(mockFact);
      factRepository.find.mockResolvedValue([]);
      projectRepository.findOne.mockResolvedValue(mockProject);

      await service.findOneWithRelationships('fact-123', ownerUser);

      // Owner should bypass member checks
      expect(projectMemberRepository.findOne).not.toHaveBeenCalled();
    });

    it('should check project member role for access', async () => {
      const viewerUser: User = {
        id: 'viewer-user',
        email: 'viewer@example.com',
        applicationRole: ApplicationRole.USER,
      } as User;

      const projectMember: ProjectMember = {
        id: 'member-1',
        projectId: 'project-123',
        userId: 'viewer-user',
        role: ProjectRole.VIEWER,
      } as ProjectMember;

      factRepository.findOne.mockResolvedValue(mockFact);
      factRepository.find.mockResolvedValue([]);
      projectRepository.findOne.mockResolvedValue(mockProject);
      projectMemberRepository.findOne.mockResolvedValue(projectMember);

      await service.findOneWithRelationships('fact-123', viewerUser);

      expect(projectMemberRepository.findOne).toHaveBeenCalledWith({
        where: { projectId: 'project-123', userId: 'viewer-user' },
      });
    });
  });
});
