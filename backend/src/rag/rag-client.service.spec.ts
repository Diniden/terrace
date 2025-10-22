import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RagClientService } from './rag-client.service';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('RagClientService', () => {
  let service: RagClientService;
  let configService: ConfigService;

  const mockAxiosInstance = {
    post: jest.fn(),
    get: jest.fn(),
  };

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();
    mockedAxios.create.mockReturnValue(mockAxiosInstance as any);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RagClientService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config: Record<string, any> = {
                RAG_SERVICE_HOST: 'http://localhost',
                RAG_SERVICE_PORT: 8001,
                RAG_SERVICE_ENABLED: true,
              };
              return config[key] ?? defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<RagClientService>(RagClientService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('isEnabled', () => {
    it('should return true when RAG service is enabled', () => {
      expect(service.isEnabled()).toBe(true);
    });

    it('should return false when RAG service is disabled', async () => {
      // Create new service with disabled config
      const module = await Test.createTestingModule({
        providers: [
          RagClientService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string, defaultValue?: any) => {
                const config: Record<string, any> = {
                  RAG_SERVICE_HOST: 'http://localhost',
                  RAG_SERVICE_PORT: 8001,
                  RAG_SERVICE_ENABLED: false,
                };
                return config[key] ?? defaultValue;
              }),
            },
          },
        ],
      }).compile();

      const disabledService = module.get<RagClientService>(RagClientService);
      expect(disabledService.isEnabled()).toBe(false);
    });
  });

  describe('embedFact', () => {
    it('should successfully embed a fact', async () => {
      const mockResponse = {
        data: {
          success: true,
          fact_id: 'fact-123',
          message: 'Fact embedded successfully',
        },
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await service.embedFact(
        'fact-123',
        'This is a test fact',
        'corpus-456',
      );

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/embed',
        {
          fact_id: 'fact-123',
          statement: 'This is a test fact',
          context_id: 'corpus-456',
        },
        { timeout: 30000 },
      );

      expect(result).toEqual(mockResponse.data);
    });

    it('should handle connection refused error', async () => {
      const error: any = new Error('Connection refused');
      error.code = 'ECONNREFUSED';
      error.isAxiosError = true;
      mockAxiosInstance.post.mockRejectedValue(error);

      // Mock axios.isAxiosError to return true for this error
      jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);

      const result = await service.embedFact('fact-123', 'Test statement');

      expect(service.isError(result)).toBe(true);
      if (service.isError(result)) {
        expect(result.code).toBe('CONNECTION_REFUSED');
        expect(result.message).toContain('Cannot connect to RAG service');
      }
    });

    it('should handle timeout error', async () => {
      const error: any = new Error('Timeout');
      error.code = 'ETIMEDOUT';
      error.isAxiosError = true;
      mockAxiosInstance.post.mockRejectedValue(error);

      // Mock axios.isAxiosError to return true for this error
      jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);

      const result = await service.embedFact('fact-123', 'Test statement');

      expect(service.isError(result)).toBe(true);
      if (service.isError(result)) {
        expect(result.code).toBe('TIMEOUT');
        expect(result.message).toContain('timed out');
      }
    });

    it('should handle HTTP error responses', async () => {
      const error: any = new Error('Bad Request');
      error.response = {
        status: 400,
        data: { message: 'Invalid request' },
      };
      mockAxiosInstance.post.mockRejectedValue(error);

      const result = await service.embedFact('fact-123', 'Test statement');

      expect(service.isError(result)).toBe(true);
      if (service.isError(result)) {
        expect(result.code).toBe('HTTP_400');
        expect(result.message).toContain('Invalid request');
      }
    });

    it('should retry on server errors', async () => {
      const error: any = new Error('Internal Server Error');
      error.response = { status: 500 };

      mockAxiosInstance.post
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce({
          data: {
            success: true,
            fact_id: 'fact-123',
            message: 'Success',
          },
        });

      const result = await service.embedFact('fact-123', 'Test statement');

      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(3);
      expect(service.isError(result)).toBe(false);
    });

    it('should not retry on client errors', async () => {
      const error: any = new Error('Bad Request');
      error.response = { status: 400 };
      mockAxiosInstance.post.mockRejectedValue(error);

      const result = await service.embedFact('fact-123', 'Test statement');

      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(1);
      expect(service.isError(result)).toBe(true);
    });

    it('should return error when service is disabled', async () => {
      const module = await Test.createTestingModule({
        providers: [
          RagClientService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => {
                if (key === 'RAG_SERVICE_ENABLED') return false;
                return key === 'RAG_SERVICE_HOST'
                  ? 'http://localhost'
                  : key === 'RAG_SERVICE_PORT'
                    ? 8001
                    : true;
              }),
            },
          },
        ],
      }).compile();

      const disabledService = module.get<RagClientService>(RagClientService);
      const result = await disabledService.embedFact('fact-123', 'Test');

      expect(service.isError(result)).toBe(true);
      if (disabledService.isError(result)) {
        expect(result.code).toBe('SERVICE_DISABLED');
      }
    });
  });

  describe('searchFacts', () => {
    it('should successfully search facts', async () => {
      const mockResponse = {
        data: {
          results: [
            {
              fact_id: 'fact-1',
              score: 0.95,
              statement: 'Matched statement 1',
            },
            {
              fact_id: 'fact-2',
              score: 0.87,
              statement: 'Matched statement 2',
            },
          ],
        },
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await service.searchFacts(
        'test query',
        10,
        ['corpus-123'],
      );

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/search',
        {
          query: 'test query',
          limit: 10,
          context_ids: ['corpus-123'],
        },
        { timeout: 10000 },
      );

      expect(result).toEqual(mockResponse.data);
    });

    it('should use default limit when not provided', async () => {
      const mockResponse = { data: { results: [] } };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      await service.searchFacts('test query');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/search',
        {
          query: 'test query',
          limit: 10,
          context_ids: undefined,
        },
        { timeout: 10000 },
      );
    });
  });

  describe('healthCheck', () => {
    it('should successfully check health', async () => {
      const mockResponse = {
        data: {
          status: 'healthy',
          provider: 'openai',
          chromadb: 'connected',
          embedding_dimension: 1536,
        },
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await service.healthCheck();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/health', {
        timeout: 5000,
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle health check errors', async () => {
      const error: any = new Error('Service unavailable');
      error.response = { status: 503 };
      mockAxiosInstance.get.mockRejectedValue(error);

      const result = await service.healthCheck();

      expect(service.isError(result)).toBe(true);
    });
  });

  describe('isError', () => {
    it('should identify error responses', () => {
      const error = { code: 'TEST_ERROR', message: 'Test error' };
      expect(service.isError(error)).toBe(true);
    });

    it('should identify successful responses', () => {
      const success = { success: true, fact_id: '123', message: 'Success' };
      expect(service.isError(success)).toBe(false);
    });
  });
});
