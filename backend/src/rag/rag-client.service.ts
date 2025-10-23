import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  EmbedRequest,
  EmbedResponse,
  SearchRequest,
  SearchResponse,
  HealthResponse,
  RagClientError,
} from './interfaces/rag-client.interface';

/**
 * HTTP client for Python RAG service communication
 *
 * Handles all network communication with the Python RAG service,
 * including embedding facts, searching facts, and health checks.
 *
 * Features:
 * - Configuration from environment variables
 * - Automatic retry with exponential backoff
 * - Graceful error handling
 * - Timeout management
 * - Automatic health monitoring with periodic checks
 */
@Injectable()
export class RagClientService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RagClientService.name);
  private readonly httpClient: AxiosInstance;
  private readonly baseUrl: string;
  private readonly enabled: boolean;

  // Timeouts
  private readonly EMBED_TIMEOUT = 30000; // 30 seconds
  private readonly SEARCH_TIMEOUT = 10000; // 10 seconds
  private readonly HEALTH_TIMEOUT = 5000; // 5 seconds

  // Retry configuration
  private readonly MAX_RETRIES = 3;
  private readonly INITIAL_RETRY_DELAY = 1000; // 1 second

  // Health monitoring
  private readonly HEALTH_CHECK_INTERVAL = 60000; // 60 seconds
  private healthCheckTimer?: ReturnType<typeof setInterval>;
  private lastHealthStatus: 'healthy' | 'unavailable' | 'unknown' = 'unknown';

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>(
      'RAG_SERVICE_HOST',
      'http://localhost',
    );
    const port = this.configService.get<number>('RAG_SERVICE_PORT', 8001);
    this.enabled = this.configService.get<boolean>('RAG_SERVICE_ENABLED', true);

    this.baseUrl = `${host}:${port}`;

    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!this.enabled) {
      this.logger.warn('RAG service is disabled by configuration');
    } else {
      this.logger.log(`RAG client initialized with base URL: ${this.baseUrl}`);
    }
  }

  /**
   * Check if RAG service is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Embed a fact in the vector database
   *
   * @param factId Unique identifier for the fact
   * @param statement The text content to embed
   * @param contextId Optional context identifier for filtering
   * @returns Embedding response or error
   */
  async embedFact(
    factId: string,
    statement: string,
    contextId?: string,
  ): Promise<EmbedResponse | RagClientError> {
    if (!this.enabled) {
      return this.createDisabledError('embedFact');
    }

    const request: EmbedRequest = {
      fact_id: factId,
      statement,
      context_id: contextId,
    };

    return this.executeWithRetry(
      async () => {
        const response = await this.httpClient.post<EmbedResponse>(
          '/embed',
          request,
          {
            timeout: this.EMBED_TIMEOUT,
          },
        );
        return response.data;
      },
      'embedFact',
      factId,
    );
  }

  /**
   * Search for facts using natural language query
   *
   * @param query Natural language search query
   * @param limit Maximum number of results to return
   * @param contextIds Optional list of context IDs to filter by
   * @returns Search results or error
   */
  async searchFacts(
    query: string,
    limit: number = 10,
    contextIds?: string[],
  ): Promise<SearchResponse | RagClientError> {
    if (!this.enabled) {
      return this.createDisabledError('searchFacts');
    }

    const request: SearchRequest = {
      query,
      limit,
      context_ids: contextIds,
    };

    return this.executeWithRetry(
      async () => {
        const response = await this.httpClient.post<SearchResponse>(
          '/search',
          request,
          {
            timeout: this.SEARCH_TIMEOUT,
          },
        );
        return response.data;
      },
      'searchFacts',
      query,
    );
  }

  /**
   * Check health status of RAG service
   *
   * @returns Health response or error
   */
  async healthCheck(): Promise<HealthResponse | RagClientError> {
    if (!this.enabled) {
      return this.createDisabledError('healthCheck');
    }

    return this.executeWithRetry(async () => {
      const response = await this.httpClient.get<HealthResponse>('/health', {
        timeout: this.HEALTH_TIMEOUT,
      });
      return response.data;
    }, 'healthCheck');
  }

  /**
   * Execute a request with automatic retry and exponential backoff
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    identifier?: string,
  ): Promise<T | RagClientError> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        const result = await operation();
        if (attempt > 0) {
          this.logger.log(
            `${operationName} succeeded on attempt ${attempt + 1}${identifier ? ` for ${identifier}` : ''}`,
          );
        }
        return result;
      } catch (error) {
        lastError = error as Error;

        const isLastAttempt = attempt === this.MAX_RETRIES - 1;
        const axiosError = error as AxiosError;

        // Don't retry on client errors (4xx)
        if (axiosError.response?.status && axiosError.response.status < 500) {
          this.logger.error(
            `${operationName} failed with client error (${axiosError.response.status})${identifier ? ` for ${identifier}` : ''}: ${axiosError.message}`,
          );
          return this.createErrorFromAxiosError(axiosError);
        }

        if (!isLastAttempt) {
          const delay = this.INITIAL_RETRY_DELAY * Math.pow(2, attempt);
          this.logger.warn(
            `${operationName} failed on attempt ${attempt + 1}${identifier ? ` for ${identifier}` : ''}, retrying in ${delay}ms...`,
          );
          await this.sleep(delay);
        }
      }
    }

    // All retries exhausted
    this.logger.error(
      `${operationName} failed after ${this.MAX_RETRIES} attempts${identifier ? ` for ${identifier}` : ''}: ${lastError?.message}`,
    );

    if (axios.isAxiosError(lastError)) {
      return this.createErrorFromAxiosError(lastError);
    }

    return {
      message: lastError?.message || 'Unknown error',
      code: 'UNKNOWN_ERROR',
      details: lastError,
    };
  }

  /**
   * Create a standardized error response from Axios error
   */
  private createErrorFromAxiosError(error: AxiosError): RagClientError {
    if (error.code === 'ECONNREFUSED') {
      return {
        message: `Cannot connect to RAG service at ${this.baseUrl}`,
        code: 'CONNECTION_REFUSED',
        details: error.message,
      };
    }

    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      return {
        message: 'Request to RAG service timed out',
        code: 'TIMEOUT',
        details: error.message,
      };
    }

    if (error.response) {
      const responseData = error.response.data as RagClientError;

      return {
        message: responseData?.message || error.message || 'RAG service error',
        code: `HTTP_${error.response.status}`,
        details: error.response.data,
      };
    }

    return {
      message: error.message || 'Network error',
      code: error.code || 'NETWORK_ERROR',
      details: error,
    };
  }

  /**
   * Create error response for disabled service
   */
  private createDisabledError(operation: string): RagClientError {
    return {
      message: `RAG service is disabled. Cannot perform ${operation}.`,
      code: 'SERVICE_DISABLED',
    };
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Check if a response is an error
   */
  isError(response: any): response is RagClientError {
    return Boolean(response && 'code' in response && 'message' in response);
  }

  /**
   * Lifecycle hook: Initialize health monitoring on module start
   */
  async onModuleInit() {
    if (!this.enabled) {
      this.logger.log('RAG service is disabled - skipping health monitoring');
      return;
    }

    this.logger.log('Starting RAG service health monitoring');

    // Perform initial health check
    await this.performHealthCheck();

    // Set up periodic health checks
    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck().catch(() => {
        this.logger.error('Error performing health check');
      });
    }, this.HEALTH_CHECK_INTERVAL);
  }

  /**
   * Lifecycle hook: Clean up health monitoring on module destroy
   */
  onModuleDestroy() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.logger.log('RAG service health monitoring stopped');
    }
  }

  /**
   * Perform a health check and log only on state changes
   */
  private async performHealthCheck(): Promise<void> {
    try {
      const response = await this.httpClient.get<HealthResponse>('/health', {
        timeout: this.HEALTH_TIMEOUT,
      });

      const isHealthy = response.data.status === 'healthy';
      const newStatus: 'healthy' | 'unavailable' = isHealthy
        ? 'healthy'
        : 'unavailable';

      // Log only on state change
      if (this.lastHealthStatus !== newStatus) {
        if (newStatus === 'unavailable') {
          this.logger.warn(
            `RAG service is unavailable: ${response.data.status} (ChromaDB: ${response.data.chromadb})`,
          );
        } else if (this.lastHealthStatus === 'unavailable') {
          // Log recovery
          this.logger.log('RAG service is now available');
        }
        this.lastHealthStatus = newStatus;
      }
    } catch (error) {
      const axiosError = error as AxiosError;

      // Only log if transitioning from healthy/unknown to unavailable
      if (this.lastHealthStatus !== 'unavailable') {
        if (axiosError.code === 'ECONNREFUSED') {
          this.logger.warn(
            `RAG service is unavailable: Cannot connect to ${this.baseUrl}`,
          );
        } else if (
          axiosError.code === 'ETIMEDOUT' ||
          axiosError.code === 'ECONNABORTED'
        ) {
          this.logger.warn(
            `RAG service is unavailable: Connection timeout to ${this.baseUrl}`,
          );
        } else {
          this.logger.warn(
            `RAG service is unavailable: ${axiosError.message || 'Unknown error'}`,
          );
        }
        this.lastHealthStatus = 'unavailable';
      }
    }
  }
}
