import { Fact } from '../../entities/fact.entity';

/**
 * Result interface for natural language fact search
 * Contains the full fact entity enriched with similarity score
 */
export interface FactSearchResult {
  /** Full fact entity with all relations loaded */
  fact: Fact;

  /** Similarity score from ChromaDB (normalized to 0-100 scale) */
  score: number;

  /** The statement that was matched for highlighting purposes */
  matchedStatement: string;
}
