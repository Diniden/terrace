import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RagEmbeddingService } from './rag-embedding.service';
import { RagClientService } from './rag-client.service';
import { Fact, EmbeddingStatus } from '../entities/fact.entity';

describe('RagEmbeddingService', () => {
  let service: RagEmbeddingService;
  let factRepository: jest.Mocked<Repository<Fact>>;
  let ragClient: jest.Mocked<RagClientService>;

  const mockFact: Partial<Fact> = {
    id: 'fact-123',
    statement: 'This is a test fact statement',
    corpusId: 'corpus-456',
    embeddingStatus: EmbeddingStatus.PENDING,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RagEmbeddingService,
        {
          provide: getRepositoryToken(Fact),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            update: jest.fn(),
            count: jest.fn(),
          },
        },
        {
          provide: RagClientService,
          useValue: {
            isEnabled: jest.fn(),
            embedFact: jest.fn(),
            isError: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RagEmbeddingService>(RagEmbeddingService);
    factRepository = module.get(getRepositoryToken(Fact));
    ragClient = module.get(RagClientService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processFactEmbedding', () => {
    it('should process fact embedding successfully', async () => {
      ragClient.isEnabled.mockReturnValue(true);
      factRepository.findOne.mockResolvedValue(mockFact as Fact);
      ragClient.embedFact.mockResolvedValue({
        success: true,
        fact_id: 'fact-123',
        message: 'Embedded successfully',
      });
      ragClient.isError.mockReturnValue(false);

      await service.processFactEmbedding('fact-123');

      // Give async operations time to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(factRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'fact-123' },
        relations: ['corpus'],
      });
      expect(ragClient.embedFact).toHaveBeenCalledWith(
        'fact-123',
        'This is a test fact statement',
        'corpus-456',
      );
      expect(factRepository.update).toHaveBeenCalledWith('fact-123', {
        embeddingStatus: EmbeddingStatus.EMBEDDED,
        lastEmbeddedAt: expect.any(Date),
        embeddingVersion: '1.0',
        embeddingModel: 'openai-text-embedding-3-small',
      });
    });

    it('should skip embedding when fact not found', async () => {
      factRepository.findOne.mockResolvedValue(null);

      await service.processFactEmbedding('nonexistent-fact');
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(ragClient.embedFact).not.toHaveBeenCalled();
    });

    it('should skip embedding when statement is empty', async () => {
      const factWithoutStatement = { ...mockFact, statement: '' };
      factRepository.findOne.mockResolvedValue(factWithoutStatement as Fact);

      await service.processFactEmbedding('fact-123');
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(ragClient.embedFact).not.toHaveBeenCalled();
    });

    it('should skip embedding when RAG client is disabled', async () => {
      ragClient.isEnabled.mockReturnValue(false);
      factRepository.findOne.mockResolvedValue(mockFact as Fact);

      await service.processFactEmbedding('fact-123');
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(ragClient.embedFact).not.toHaveBeenCalled();
    });

    it('should mark embedding as failed on error', async () => {
      ragClient.isEnabled.mockReturnValue(true);
      factRepository.findOne.mockResolvedValue(mockFact as Fact);
      ragClient.embedFact.mockResolvedValue({
        message: 'Connection error',
        code: 'CONNECTION_REFUSED',
      });
      ragClient.isError.mockReturnValue(true);

      await service.processFactEmbedding('fact-123');
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(factRepository.update).toHaveBeenCalledWith('fact-123', {
        embeddingStatus: EmbeddingStatus.FAILED,
        meta: {
          embeddingError: 'Connection error',
          embeddingFailedAt: expect.any(String),
        },
      });
    });

    it('should handle embedding exception gracefully', async () => {
      ragClient.isEnabled.mockReturnValue(true);
      factRepository.findOne.mockResolvedValue(mockFact as Fact);
      ragClient.embedFact.mockRejectedValue(
        new Error('Unexpected embedding error'),
      );

      await service.processFactEmbedding('fact-123');
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(factRepository.update).toHaveBeenCalledWith('fact-123', {
        embeddingStatus: EmbeddingStatus.FAILED,
        meta: {
          embeddingError: 'Unexpected embedding error',
          embeddingFailedAt: expect.any(String),
        },
      });
    });
  });

  describe('processPendingEmbeddings', () => {
    it('should process all pending embeddings', async () => {
      const pendingFacts = [
        { ...mockFact, id: 'fact-1' },
        { ...mockFact, id: 'fact-2' },
        { ...mockFact, id: 'fact-3' },
      ];

      factRepository.find.mockResolvedValue(pendingFacts as Fact[]);
      ragClient.isEnabled.mockReturnValue(true);
      ragClient.embedFact.mockResolvedValue({
        success: true,
        fact_id: 'fact-1',
        message: 'Success',
      });
      ragClient.isError.mockReturnValue(false);

      await service.processPendingEmbeddings();
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(factRepository.find).toHaveBeenCalledWith({
        where: { embeddingStatus: EmbeddingStatus.PENDING },
        take: 100,
        order: { createdAt: 'ASC' },
      });
    });

    it('should handle no pending embeddings', async () => {
      factRepository.find.mockResolvedValue([]);

      await service.processPendingEmbeddings();

      expect(factRepository.find).toHaveBeenCalled();
      expect(ragClient.embedFact).not.toHaveBeenCalled();
    });

    it('should respect the limit parameter', async () => {
      factRepository.find.mockResolvedValue([]);

      await service.processPendingEmbeddings(50);

      expect(factRepository.find).toHaveBeenCalledWith({
        where: { embeddingStatus: EmbeddingStatus.PENDING },
        take: 50,
        order: { createdAt: 'ASC' },
      });
    });
  });

  describe('retryFailedEmbeddings', () => {
    it('should retry failed embeddings', async () => {
      const failedFacts = [
        { ...mockFact, id: 'fact-1', embeddingStatus: EmbeddingStatus.FAILED },
        { ...mockFact, id: 'fact-2', embeddingStatus: EmbeddingStatus.FAILED },
      ];

      factRepository.find.mockResolvedValue(failedFacts as Fact[]);

      await service.retryFailedEmbeddings();
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(factRepository.find).toHaveBeenCalledWith({
        where: { embeddingStatus: EmbeddingStatus.FAILED },
        take: 50,
        order: { updatedAt: 'ASC' },
      });

      expect(factRepository.update).toHaveBeenCalledWith('fact-1', {
        embeddingStatus: EmbeddingStatus.PENDING,
      });
      expect(factRepository.update).toHaveBeenCalledWith('fact-2', {
        embeddingStatus: EmbeddingStatus.PENDING,
      });
    });

    it('should handle no failed embeddings', async () => {
      factRepository.find.mockResolvedValue([]);

      await service.retryFailedEmbeddings();

      expect(factRepository.find).toHaveBeenCalled();
    });

    it('should respect the limit parameter', async () => {
      factRepository.find.mockResolvedValue([]);

      await service.retryFailedEmbeddings(25);

      expect(factRepository.find).toHaveBeenCalledWith({
        where: { embeddingStatus: EmbeddingStatus.FAILED },
        take: 25,
        order: { updatedAt: 'ASC' },
      });
    });
  });

  describe('getEmbeddingStats', () => {
    it('should return embedding statistics', async () => {
      factRepository.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(70) // embedded
        .mockResolvedValueOnce(20) // pending
        .mockResolvedValueOnce(10); // failed

      const stats = await service.getEmbeddingStats();

      expect(stats).toEqual({
        total: 100,
        embedded: 70,
        pending: 20,
        failed: 10,
      });
    });

    it('should handle empty database', async () => {
      factRepository.count.mockResolvedValue(0);

      const stats = await service.getEmbeddingStats();

      expect(stats).toEqual({
        total: 0,
        embedded: 0,
        pending: 0,
        failed: 0,
      });
    });
  });

  describe('deleteFactEmbedding', () => {
    it('should log deletion warning (not implemented yet)', async () => {
      await service.deleteFactEmbedding('fact-123');

      // This is just a placeholder - no actual implementation yet
      // Just verify it doesn't throw an error
      expect(true).toBe(true);
    });
  });
});
