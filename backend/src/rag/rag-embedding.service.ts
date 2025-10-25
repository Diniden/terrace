import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Fact, EmbeddingStatus } from '../entities/fact.entity';
import { RagClientService } from './rag-client.service';

/**
 * Service for managing fact embeddings in the RAG system
 *
 * Handles the lifecycle of fact embeddings:
 * - Automatically triggers embedding when facts are created with statements
 * - Triggers re-embedding when fact statements change
 * - Updates embedding status and metadata in the database
 * - Handles embedding failures gracefully
 *
 * Design principles:
 * - Embeddings are fire-and-forget (async, non-blocking)
 * - Embedding failures do NOT prevent fact operations
 * - Failed embeddings are marked and can be retried later
 * - Background processing for pending embeddings
 */
@Injectable()
export class RagEmbeddingService {
  private readonly logger = new Logger(RagEmbeddingService.name);

  constructor(
    @InjectRepository(Fact)
    private readonly factRepository: Repository<Fact>,
    private readonly ragClient: RagClientService,
  ) {}

  /**
   * Process embedding for a fact (fire-and-forget)
   *
   * This method is called after fact create/update operations.
   * It runs asynchronously and does not block the calling operation.
   *
   * @param factId The ID of the fact to embed
   */
  processFactEmbedding(factId: string) {
    // Fire-and-forget: don't await, don't block
    this.embedFactAsync(factId).catch((error: Error) => {
      this.logger.error(
        `Unhandled error in processFactEmbedding for fact ${factId}: ${error.message}`,
        error.stack,
      );
    });
  }

  /**
   * Embed a fact asynchronously
   *
   * @param factId The ID of the fact to embed
   */
  private async embedFactAsync(factId: string): Promise<void> {
    try {
      // Fetch the fact
      const fact = await this.factRepository.findOne({
        where: { id: factId },
        relations: ['corpus'],
      });

      if (!fact) {
        this.logger.warn(`Fact ${factId} not found for embedding`);
        return;
      }

      // Only embed if there's a statement
      if (!fact.statement || fact.statement.trim() === '') {
        this.logger.debug(
          `Fact ${factId} has no statement, skipping embedding`,
        );
        return;
      }

      // Check if RAG client is enabled
      if (!this.ragClient.isEnabled()) {
        this.logger.debug(
          `RAG client is disabled, skipping embedding for fact ${factId}`,
        );
        return;
      }

      this.logger.log(`Embedding fact ${factId}`);

      // Call RAG service to embed
      const contextId = fact.corpusId; // Use corpus ID as context
      const response = await this.ragClient.embedFact(
        factId,
        fact.statement,
        contextId,
      );

      // Handle response
      if (this.ragClient.isError(response)) {
        this.logger.error(
          `Failed to embed fact ${factId}: ${response.message}`,
          response.details,
        );
        await this.markEmbeddingFailed(factId, response.message);
      } else {
        this.logger.log(`Successfully embedded fact ${factId}`);
        await this.markEmbeddingSucceeded(factId);
      }
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          `Error embedding fact ${factId}: ${error.message}`,
          error.stack,
        );
        await this.markEmbeddingFailed(factId, error.message);
      } else {
        this.logger.error(`Error embedding fact ${factId}: ${error}`);
      }
    }
  }

  /**
   * Mark a fact embedding as successful
   */
  private async markEmbeddingSucceeded(factId: string): Promise<void> {
    try {
      await this.factRepository.update(factId, {
        embeddingStatus: EmbeddingStatus.EMBEDDED,
        lastEmbeddedAt: new Date(),
        embeddingVersion: '1.0', // Version for tracking embedding model changes
        embeddingModel: 'openai-text-embedding-3-small', // Model identifier
      });
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          `Failed to update embedding status for fact ${factId}: ${error.message}`,
        );
      } else {
        this.logger.error(
          `Failed to update embedding status for fact ${factId}: ${error}`,
        );
      }
    }
  }

  /**
   * Mark a fact embedding as failed
   */
  private async markEmbeddingFailed(
    factId: string,
    errorMessage: string,
  ): Promise<void> {
    try {
      // Fetch the fact first to preserve existing meta
      const fact = await this.factRepository.findOne({
        where: { id: factId },
      });

      if (!fact) {
        return;
      }

      const updatedMeta: Record<string, any> = {
        ...fact.meta,
        embeddingError: errorMessage,
        embeddingFailedAt: new Date().toISOString(),
      };

      await this.factRepository.update(factId, {
        embeddingStatus: EmbeddingStatus.FAILED,
        meta: updatedMeta,
      });
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          `Failed to mark embedding as failed for fact ${factId}: ${error.message}`,
        );
      } else {
        this.logger.error(
          `Failed to mark embedding as failed for fact ${factId}: ${error}`,
        );
      }
    }
  }

  /**
   * Process all pending fact embeddings
   *
   * This method can be called by a background job or cron to process
   * facts that are marked as PENDING but haven't been embedded yet.
   *
   * @param limit Maximum number of facts to process in one batch
   */
  async processPendingEmbeddings(limit: number = 100): Promise<void> {
    try {
      this.logger.log('Processing pending embeddings...');

      const pendingFacts = await this.factRepository.find({
        where: { embeddingStatus: EmbeddingStatus.PENDING },
        take: limit,
        order: { createdAt: 'ASC' },
      });

      if (pendingFacts.length === 0) {
        this.logger.debug('No pending embeddings to process');
        return;
      }

      this.logger.log(
        `Found ${pendingFacts.length} pending embeddings to process`,
      );

      // Process each fact (fire-and-forget)
      for (const fact of pendingFacts) {
        this.processFactEmbedding(fact.id);
      }
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          `Error processing pending embeddings: ${error.message}`,
          error.stack,
        );
      } else {
        this.logger.error(`Error processing pending embeddings: ${error}`);
      }
    }
  }

  /**
   * Retry failed embeddings
   *
   * This method can be called to retry facts that failed to embed.
   *
   * @param limit Maximum number of facts to retry in one batch
   */
  async retryFailedEmbeddings(limit: number = 50): Promise<void> {
    try {
      this.logger.log('Retrying failed embeddings...');

      const failedFacts = await this.factRepository.find({
        where: { embeddingStatus: EmbeddingStatus.FAILED },
        take: limit,
        order: { updatedAt: 'ASC' },
      });

      if (failedFacts.length === 0) {
        this.logger.debug('No failed embeddings to retry');
        return;
      }

      this.logger.log(`Found ${failedFacts.length} failed embeddings to retry`);

      // Mark as pending and process
      for (const fact of failedFacts) {
        await this.factRepository.update(fact.id, {
          embeddingStatus: EmbeddingStatus.PENDING,
        });
        this.processFactEmbedding(fact.id);
      }
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          `Error retrying failed embeddings: ${error.message}`,
          error.stack,
        );
      } else {
        this.logger.error(`Error retrying failed embeddings: ${error}`);
      }
    }
  }

  /**
   * Delete a fact's embedding from the vector database
   *
   * Should be called when a fact is deleted.
   *
   * @param factId The ID of the fact to delete embedding for
   */
  deleteFactEmbedding(factId: string) {
    // Note: The Python RAG service should expose a DELETE /embed/:fact_id endpoint
    // For now, we'll just log that this should be done
    this.logger.warn(
      `Fact ${factId} deleted - embedding cleanup in ChromaDB should be implemented`,
    );
    // TODO: Implement when Python service has delete endpoint
  }

  /**
   * Get embedding statistics
   */
  async getEmbeddingStats(): Promise<{
    total: number;
    embedded: number;
    pending: number;
    failed: number;
  }> {
    const [total, embedded, pending, failed] = await Promise.all([
      this.factRepository.count(),
      this.factRepository.count({
        where: { embeddingStatus: EmbeddingStatus.EMBEDDED },
      }),
      this.factRepository.count({
        where: { embeddingStatus: EmbeddingStatus.PENDING },
      }),
      this.factRepository.count({
        where: { embeddingStatus: EmbeddingStatus.FAILED },
      }),
    ]);

    return { total, embedded, pending, failed };
  }
}
