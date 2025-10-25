import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RagSearchService } from './rag-search.service';
import { RagClientService } from './rag-client.service';
import { Fact } from '../entities/fact.entity';

describe('RagSearchService', () => {
  let service: RagSearchService;
  let factRepository: jest.Mocked<Repository<Fact>>;
  let ragClient: jest.Mocked<RagClientService>;

  const mockFact1: Partial<Fact> = {
    id: 'fact-1',
    statement: 'Test fact 1',
    corpusId: 'corpus-1',
  };

  const mockFact2: Partial<Fact> = {
    id: 'fact-2',
    statement: 'Test fact 2',
    corpusId: 'corpus-1',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RagSearchService,
        {
          provide: getRepositoryToken(Fact),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: RagClientService,
          useValue: {
            isEnabled: jest.fn(),
            searchFacts: jest.fn(),
            healthCheck: jest.fn(),
            isError: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RagSearchService>(RagSearchService);
    factRepository = module.get(getRepositoryToken(Fact));
    ragClient = module.get(RagClientService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('searchFactsByNaturalLanguage', () => {
    it('should successfully search facts', async () => {
      const searchResponse = {
        results: [
          { fact_id: 'fact-1', score: 0.1, statement: 'Test fact 1' },
          { fact_id: 'fact-2', score: 0.3, statement: 'Test fact 2' },
        ],
      };

      ragClient.isEnabled.mockReturnValue(true);
      ragClient.searchFacts.mockResolvedValue(searchResponse);
      ragClient.isError.mockReturnValue(false);
      factRepository.find.mockResolvedValue([
        mockFact1 as Fact,
        mockFact2 as Fact,
      ]);

      const results = await service.searchFactsByNaturalLanguage(
        'test query',
        10,
      );

      expect(ragClient.searchFacts).toHaveBeenCalledWith(
        'test query',
        10,
        undefined,
      );
      expect(factRepository.find).toHaveBeenCalledWith({
        where: { id: expect.any(Object) },
        relations: ['corpus', 'basis', 'supports', 'supportedBy'],
      });
      expect(results).toHaveLength(2);
      expect(results[0].fact).toEqual(mockFact1);
      expect(results[0].score).toBeGreaterThan(0);
      expect(results[0].matchedStatement).toBe('Test fact 1');
    });

    it('should return empty array for empty query', async () => {
      const results = await service.searchFactsByNaturalLanguage('');

      expect(results).toEqual([]);
      expect(ragClient.searchFacts).not.toHaveBeenCalled();
    });

    it('should return empty array when RAG client is disabled', async () => {
      ragClient.isEnabled.mockReturnValue(false);

      const results = await service.searchFactsByNaturalLanguage('test query');

      expect(results).toEqual([]);
      expect(ragClient.searchFacts).not.toHaveBeenCalled();
    });

    it('should handle RAG client errors gracefully', async () => {
      ragClient.isEnabled.mockReturnValue(true);
      ragClient.searchFacts.mockResolvedValue({
        message: 'Connection error',
        code: 'CONNECTION_REFUSED',
      });
      ragClient.isError.mockReturnValue(true);

      const results = await service.searchFactsByNaturalLanguage('test query');

      expect(results).toEqual([]);
    });

    it('should handle empty search results', async () => {
      ragClient.isEnabled.mockReturnValue(true);
      ragClient.searchFacts.mockResolvedValue({ results: [] });
      ragClient.isError.mockReturnValue(false);

      const results = await service.searchFactsByNaturalLanguage('test query');

      expect(results).toEqual([]);
    });

    it('should filter out facts not found in database', async () => {
      const searchResponse = {
        results: [
          { fact_id: 'fact-1', score: 0.1, statement: 'Test fact 1' },
          {
            fact_id: 'nonexistent',
            score: 0.2,
            statement: 'Nonexistent fact',
          },
          { fact_id: 'fact-2', score: 0.3, statement: 'Test fact 2' },
        ],
      };

      ragClient.isEnabled.mockReturnValue(true);
      ragClient.searchFacts.mockResolvedValue(searchResponse);
      ragClient.isError.mockReturnValue(false);
      factRepository.find.mockResolvedValue([
        mockFact1 as Fact,
        mockFact2 as Fact,
      ]);

      const results = await service.searchFactsByNaturalLanguage('test query');

      expect(results).toHaveLength(2);
      expect(results.some((r) => r.fact.id === 'nonexistent')).toBe(false);
    });

    it('should pass context IDs to RAG client', async () => {
      ragClient.isEnabled.mockReturnValue(true);
      ragClient.searchFacts.mockResolvedValue({ results: [] });
      ragClient.isError.mockReturnValue(false);

      await service.searchFactsByNaturalLanguage('test', 5, [
        'corpus-1',
        'corpus-2',
      ]);

      expect(ragClient.searchFacts).toHaveBeenCalledWith('test', 5, [
        'corpus-1',
        'corpus-2',
      ]);
    });

    it('should normalize scores to 0-100 scale', async () => {
      const searchResponse = {
        results: [
          { fact_id: 'fact-1', score: 0, statement: 'Perfect match' }, // distance 0 = score 100
          { fact_id: 'fact-2', score: 1, statement: 'Medium match' }, // distance 1 = score 50
        ],
      };

      ragClient.isEnabled.mockReturnValue(true);
      ragClient.searchFacts.mockResolvedValue(searchResponse);
      ragClient.isError.mockReturnValue(false);
      factRepository.find.mockResolvedValue([
        mockFact1 as Fact,
        mockFact2 as Fact,
      ]);

      const results = await service.searchFactsByNaturalLanguage('test');

      expect(results[0].score).toBe(100); // Perfect match
      expect(results[1].score).toBe(50); // Medium match
    });
  });

  describe('searchFactsInCorpus', () => {
    it('should search within a specific corpus', async () => {
      ragClient.isEnabled.mockReturnValue(true);
      ragClient.searchFacts.mockResolvedValue({ results: [] });
      ragClient.isError.mockReturnValue(false);

      await service.searchFactsInCorpus('corpus-123', 'test query', 5);

      expect(ragClient.searchFacts).toHaveBeenCalledWith('test query', 5, [
        'corpus-123',
      ]);
    });
  });

  describe('findSimilarFacts', () => {
    it('should find similar facts', async () => {
      const sourceFact = {
        ...mockFact1,
        statement: 'Original fact statement',
      };

      factRepository.findOne.mockResolvedValue(sourceFact as Fact);
      ragClient.isEnabled.mockReturnValue(true);
      ragClient.searchFacts.mockResolvedValue({
        results: [
          {
            fact_id: 'fact-1',
            score: 0.0,
            statement: 'Original fact statement',
          },
          {
            fact_id: 'fact-2',
            score: 0.2,
            statement: 'Similar fact statement',
          },
          {
            fact_id: 'fact-3',
            score: 0.4,
            statement: 'Another similar fact',
          },
        ],
      });
      ragClient.isError.mockReturnValue(false);
      factRepository.find.mockResolvedValue([
        sourceFact as Fact,
        mockFact2 as Fact,
        { ...mockFact2, id: 'fact-3' } as Fact,
      ]);

      const results = await service.findSimilarFacts('fact-1', 2);

      expect(factRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'fact-1' },
        relations: ['corpus'],
      });
      expect(results).toHaveLength(2);
      expect(results.every((r) => r.fact.id !== 'fact-1')).toBe(true); // Source fact filtered out
    });

    it('should return empty array when source fact not found', async () => {
      factRepository.findOne.mockResolvedValue(null);

      const results = await service.findSimilarFacts('nonexistent');

      expect(results).toEqual([]);
    });

    it('should return empty array when source fact has no statement', async () => {
      factRepository.findOne.mockResolvedValue({
        ...mockFact1,
        statement: '',
      } as Fact);

      const results = await service.findSimilarFacts('fact-1');

      expect(results).toEqual([]);
    });

    it('should respect sameCorpusOnly flag', async () => {
      const sourceFact = { ...mockFact1 };
      factRepository.findOne.mockResolvedValue(sourceFact as Fact);
      ragClient.isEnabled.mockReturnValue(true);
      ragClient.searchFacts.mockResolvedValue({ results: [] });
      ragClient.isError.mockReturnValue(false);

      await service.findSimilarFacts('fact-1', 5, true);

      expect(ragClient.searchFacts).toHaveBeenCalledWith(
        mockFact1.statement,
        6,
        [mockFact1.corpusId],
      );
    });
  });

  describe('getSearchSuggestions', () => {
    it('should return search suggestions', async () => {
      const searchResponse = {
        results: [
          { fact_id: 'fact-1', score: 0.1, statement: 'First suggestion.' },
          { fact_id: 'fact-2', score: 0.2, statement: 'Second suggestion.' },
        ],
      };

      ragClient.isEnabled.mockReturnValue(true);
      ragClient.searchFacts.mockResolvedValue(searchResponse);
      ragClient.isError.mockReturnValue(false);
      factRepository.find.mockResolvedValue([
        { ...mockFact1, statement: 'First suggestion.' } as Fact,
        { ...mockFact2, statement: 'Second suggestion.' } as Fact,
      ]);

      const suggestions = await service.getSearchSuggestions('test', 5);

      expect(suggestions).toHaveLength(2);
      expect(suggestions[0]).toContain('suggestion');
    });

    it('should return empty array for short queries', async () => {
      const suggestions = await service.getSearchSuggestions('te', 5);

      expect(suggestions).toEqual([]);
      expect(ragClient.searchFacts).not.toHaveBeenCalled();
    });

    it('should truncate long statements to 100 characters', async () => {
      const longStatement = 'A'.repeat(200) + '.';
      const searchResponse = {
        results: [{ fact_id: 'fact-1', score: 0.1, statement: longStatement }],
      };

      ragClient.isEnabled.mockReturnValue(true);
      ragClient.searchFacts.mockResolvedValue(searchResponse);
      ragClient.isError.mockReturnValue(false);
      factRepository.find.mockResolvedValue([
        { ...mockFact1, statement: longStatement } as Fact,
      ]);

      const suggestions = await service.getSearchSuggestions('test', 5);

      expect(suggestions[0].length).toBeLessThanOrEqual(100);
    });
  });

  describe('hasEmbeddings', () => {
    it('should return true when RAG service is healthy', async () => {
      ragClient.healthCheck.mockResolvedValue({
        status: 'healthy',
        provider: 'openai',
        chromadb: 'connected',
      });
      ragClient.isError.mockReturnValue(false);

      const result = await service.hasEmbeddings();

      expect(result).toBe(true);
    });

    it('should return false when RAG service returns error', async () => {
      ragClient.healthCheck.mockResolvedValue({
        message: 'Service unavailable',
        code: 'CONNECTION_REFUSED',
      });
      ragClient.isError.mockReturnValue(true);

      const result = await service.hasEmbeddings();

      expect(result).toBe(false);
    });

    it('should return false on exception', async () => {
      ragClient.healthCheck.mockRejectedValue(new Error('Network error'));

      const result = await service.hasEmbeddings();

      expect(result).toBe(false);
    });
  });
});
