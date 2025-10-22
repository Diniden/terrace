/**
 * Request/Response interfaces for Python RAG service communication
 */

export interface EmbedRequest {
  fact_id: string;
  statement: string;
  context_id?: string;
}

export interface EmbedResponse {
  success: boolean;
  fact_id: string;
  message: string;
}

export interface SearchRequest {
  query: string;
  limit: number;
  context_ids?: string[];
}

export interface SearchResult {
  fact_id: string;
  score: number;
  statement: string;
}

export interface SearchResponse {
  results: SearchResult[];
}

export interface HealthResponse {
  status: string;
  provider: string;
  chromadb: string;
  embedding_dimension?: number;
}

export interface RagClientError {
  message: string;
  code: string;
  details?: any;
}
