import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Fact } from '../entities/fact.entity';
import { RagClientService } from './rag-client.service';
import { FactSearchResult } from './interfaces/fact-search-result.interface';

/**
 * Service for natural language fact retrieval using RAG
 *
 * Provides semantic search capabilities for facts using vector embeddings.
 * Combines ChromaDB's similarity search with full fact entity enrichment.
 *
 * Features:
 * - Natural language query support
 * - Context filtering (corpus-based)
 * - Score normalization (0-100 scale)
 * - Full entity loading with relations
 * - Graceful degradation when embeddings don't exist
 */
@Injectable()
export class RagSearchService {
  private readonly logger = new Logger(RagSearchService.name);

  constructor(
    @InjectRepository(Fact)
    private readonly factRepository: Repository<Fact>,
    private readonly ragClient: RagClientService,
  ) {}

  /**
   * Search for facts using natural language query
   *
   * @param query Natural language search query
   * @param limit Maximum number of results (default: 10)
   * @param contextIds Optional corpus IDs to filter by
   * @returns Array of fact search results with similarity scores
   */
  async searchFactsByNaturalLanguage(
    query: string,
    limit: number = 10,
    contextIds?: string[],
  ): Promise<FactSearchResult[]> {
    try {
      // Validate query
      if (!query || query.trim() === '') {
        this.logger.warn('Empty search query provided');
        return [];
      }

      // Check if RAG client is enabled
      if (!this.ragClient.isEnabled()) {
        this.logger.warn('RAG client is disabled, cannot perform search');
        return [];
      }

      this.logger.log(
        `Searching facts with query: "${query}"${contextIds ? ` (contexts: ${contextIds.join(', ')})` : ''}`,
      );

      // Call RAG service to search
      const response = await this.ragClient.searchFacts(
        query,
        limit,
        contextIds,
      );

      // Handle error response
      if (this.ragClient.isError(response)) {
        this.logger.error(
          `RAG search failed: ${response.message}`,
          response.details,
        );
        return [];
      }

      // Handle empty results
      if (!response.results || response.results.length === 0) {
        this.logger.debug(
          `No results found for query: "${query}"${contextIds ? ` (contexts: ${contextIds.join(', ')})` : ''}`,
        );
        return [];
      }

      this.logger.log(
        `Found ${response.results.length} results from RAG service`,
      );

      // Extract fact IDs
      const factIds = response.results.map((r) => r.fact_id);

      // Fetch full fact entities from database
      const facts = await this.factRepository.find({
        where: { id: In(factIds) },
        relations: ['corpus', 'basis', 'supports', 'supportedBy'],
      });

      // Create a map for quick lookup
      const factsMap = new Map(facts.map((f) => [f.id, f]));

      // Build enriched results
      const results: FactSearchResult[] = [];

      for (const searchResult of response.results) {
        const fact = factsMap.get(searchResult.fact_id);

        if (!fact) {
          this.logger.warn(
            `Fact ${searchResult.fact_id} returned by RAG service not found in database`,
          );
          continue;
        }

        results.push({
          fact,
          score: this.normalizeScore(searchResult.score),
          matchedStatement: searchResult.statement,
        });
      }

      this.logger.log(
        `Enriched ${results.length} fact entities for search results`,
      );

      return results;
    } catch (error) {
      this.logger.error(
        `Error searching facts: ${error.message}`,
        error.stack,
      );
      return [];
    }
  }

  /**
   * Search facts within a specific corpus
   *
   * Convenience method for corpus-scoped searches
   *
   * @param corpusId The corpus to search within
   * @param query Natural language search query
   * @param limit Maximum number of results
   */
  async searchFactsInCorpus(
    corpusId: string,
    query: string,
    limit: number = 10,
  ): Promise<FactSearchResult[]> {
    return this.searchFactsByNaturalLanguage(query, limit, [corpusId]);
  }

  /**
   * Find similar facts to a given fact
   *
   * Uses the fact's statement as the search query
   *
   * @param factId The fact to find similar facts for
   * @param limit Maximum number of results
   * @param sameCorpusOnly Only search within the same corpus
   */
  async findSimilarFacts(
    factId: string,
    limit: number = 5,
    sameCorpusOnly: boolean = false,
  ): Promise<FactSearchResult[]> {
    try {
      // Fetch the source fact
      const sourceFact = await this.factRepository.findOne({
        where: { id: factId },
        relations: ['corpus'],
      });

      if (!sourceFact) {
        this.logger.warn(`Source fact ${factId} not found`);
        return [];
      }

      if (!sourceFact.statement || sourceFact.statement.trim() === '') {
        this.logger.warn(`Source fact ${factId} has no statement`);
        return [];
      }

      // Search using the fact's statement
      const contextIds = sameCorpusOnly ? [sourceFact.corpusId] : undefined;

      // Search for limit + 1 to account for the source fact itself
      const results = await this.searchFactsByNaturalLanguage(
        sourceFact.statement,
        limit + 1,
        contextIds,
      );

      // Filter out the source fact itself
      const filteredResults = results.filter((r) => r.fact.id !== factId);

      // Return only the requested limit
      return filteredResults.slice(0, limit);
    } catch (error) {
      this.logger.error(
        `Error finding similar facts for ${factId}: ${error.message}`,
        error.stack,
      );
      return [];
    }
  }

  /**
   * Get search suggestions based on partial query
   *
   * @param partialQuery Partial search query
   * @param limit Maximum number of suggestions
   * @param contextIds Optional corpus IDs to filter by
   */
  async getSearchSuggestions(
    partialQuery: string,
    limit: number = 5,
    contextIds?: string[],
  ): Promise<string[]> {
    try {
      if (!partialQuery || partialQuery.trim().length < 3) {
        return [];
      }

      const results = await this.searchFactsByNaturalLanguage(
        partialQuery,
        limit,
        contextIds,
      );

      // Extract unique statement beginnings as suggestions
      return results
        .map((r) => {
          const statement = r.fact.statement || '';
          // Return first 100 characters or up to first period
          const endIndex = Math.min(
            statement.indexOf('.') !== -1
              ? statement.indexOf('.') + 1
              : statement.length,
            100,
          );
          return statement.substring(0, endIndex).trim();
        })
        .filter((s) => s.length > 0);
    } catch (error) {
      this.logger.error(
        `Error getting search suggestions: ${error.message}`,
        error.stack,
      );
      return [];
    }
  }

  /**
   * Normalize similarity score to 0-100 scale
   *
   * ChromaDB returns distance metrics that need to be normalized
   * Lower distance = higher similarity
   *
   * @param rawScore Raw score from ChromaDB
   * @returns Normalized score (0-100)
   */
  private normalizeScore(rawScore: number): number {
    // ChromaDB with cosine similarity returns values between 0-2
    // where 0 = identical, 1 = orthogonal, 2 = opposite
    // We convert to a 0-100 scale where 100 = identical

    // Clamp to reasonable range
    const clampedScore = Math.max(0, Math.min(2, rawScore));

    // Convert: 0 distance = 100 score, 2 distance = 0 score
    const normalized = (1 - clampedScore / 2) * 100;

    // Round to 2 decimal places
    return Math.round(normalized * 100) / 100;
  }

  /**
   * Check if embeddings are available for search
   *
   * @returns True if at least some facts have embeddings
   */
  async hasEmbeddings(): Promise<boolean> {
    try {
      const health = await this.ragClient.healthCheck();

      if (this.ragClient.isError(health)) {
        return false;
      }

      return health.status === 'healthy';
    } catch (error) {
      this.logger.error(
        `Error checking embedding availability: ${error.message}`,
      );
      return false;
    }
  }
}
