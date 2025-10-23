"""
LitServe-based RAG service for fact embedding and semantic retrieval.

This service provides endpoints for:
- Embedding fact statements
- Semantic search/retrieval of facts
- Health checks

It uses ChromaDB for vector storage and supports multiple embedding providers.
"""

import logging
import json
import sys
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, field_validator
import litserve as ls
import chromadb
from chromadb.config import Settings

from config import config
from providers import create_provider_from_config, EmbeddingProvider

# Configure logging
logging.basicConfig(
    level=getattr(logging, config.LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)


# Request/Response Models
class EmbedRequest(BaseModel):
    """Request model for embedding a fact."""
    fact_id: str = Field(..., description="UUID of the fact")
    statement: str = Field(..., description="Fact statement to embed")
    context_id: Optional[str] = Field(
        None, description="Optional context UUID")

    @field_validator('statement')
    @classmethod
    def statement_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('Statement cannot be empty')
        return v


class EmbedResponse(BaseModel):
    """Response model for embedding operation."""
    success: bool
    fact_id: str
    message: str


class SearchRequest(BaseModel):
    """Request model for semantic search."""
    query: str = Field(..., description="Natural language query")
    limit: int = Field(
        10, description="Maximum number of results", ge=1, le=100)
    context_ids: Optional[List[str]] = Field(
        None,
        description="Optional list of context IDs to filter results"
    )

    @field_validator('query')
    @classmethod
    def query_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('Query cannot be empty')
        return v


class SearchResult(BaseModel):
    """Individual search result."""
    fact_id: str
    score: float
    statement: str


class SearchResponse(BaseModel):
    """Response model for search operation."""
    results: List[SearchResult]


class HealthResponse(BaseModel):
    """Response model for health check."""
    status: str
    provider: str
    chromadb: str
    embedding_dimension: Optional[int] = None


# LitServe API Implementation
class RAGServiceAPI(ls.LitAPI):
    """
    LitServe API for RAG operations.

    Handles embedding generation and semantic search using ChromaDB
    and configurable embedding providers.
    """

    def setup(self, device: str) -> None:
        """
        Initialize the service components.

        Args:
            device: Device string (not used for embedding models)
        """
        logger.info("Setting up RAG service...")

        # Validate configuration
        try:
            config.validate()
            logger.info(
                f"Configuration validated for provider: {config.EMBEDDING_PROVIDER}")
        except Exception as e:
            logger.error(f"Configuration validation failed: {e}")
            raise

        # Initialize embedding provider
        try:
            self.provider: EmbeddingProvider = create_provider_from_config(
                config)
            logger.info(
                f"Initialized embedding provider: {self.provider.get_provider_name()}"
            )
        except Exception as e:
            logger.error(f"Failed to initialize embedding provider: {e}")
            raise

        # Initialize ChromaDB client
        try:
            self.chroma_client = chromadb.HttpClient(
                host=config.CHROMA_HOST,
                port=config.CHROMA_PORT,
                settings=Settings(
                    anonymized_telemetry=False,
                    allow_reset=False
                )
            )
            logger.info(
                f"Connected to ChromaDB at {config.CHROMA_HOST}:{config.CHROMA_PORT}"
            )

            # Get or create collection
            self.collection = self.chroma_client.get_or_create_collection(
                name=config.CHROMA_COLLECTION_NAME,
                metadata={"description": "Fact embeddings for RAG retrieval"}
            )
            logger.info(f"Using collection: {config.CHROMA_COLLECTION_NAME}")

        except Exception as e:
            logger.error(f"Failed to connect to ChromaDB: {e}")
            logger.error(
                f"Ensure ChromaDB is running at {config.CHROMA_HOST}:{config.CHROMA_PORT}"
            )
            raise

        logger.info("RAG service setup complete")

    def decode_request(self, request: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Decode incoming request.

        Args:
            request: Raw request dictionary
            context: Request context including path

        Returns:
            Processed request with endpoint information
        """
        # Add endpoint path to request
        path = context.get("path", "/")
        request["_endpoint"] = path
        return request

    def predict(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """
        Route request to appropriate handler based on endpoint.

        Args:
            request: Decoded request

        Returns:
            Response dictionary
        """
        endpoint = request.get("_endpoint", "/")

        try:
            if endpoint == "/embed":
                return self._handle_embed(request)
            elif endpoint == "/search":
                return self._handle_search(request)
            elif endpoint == "/health":
                return self._handle_health(request)
            else:
                return {
                    "error": f"Unknown endpoint: {endpoint}",
                    "status_code": 404
                }
        except Exception as e:
            logger.error(
                f"Error handling request for {endpoint}: {e}", exc_info=True)
            return {
                "error": str(e),
                "status_code": 500
            }

    def encode_response(self, output: Dict[str, Any]) -> Dict[str, Any]:
        """
        Encode response for sending to client.

        Args:
            output: Response dictionary from predict

        Returns:
            Encoded response
        """
        return output

    def _handle_embed(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """
        Handle embedding request.

        Args:
            request: Embed request data

        Returns:
            Embed response dictionary
        """
        try:
            # Validate request
            embed_req = EmbedRequest(**request)

            logger.info(f"Embedding fact: {embed_req.fact_id}")

            # Generate embedding
            embedding = self.provider.embed(embed_req.statement)

            # Prepare metadata
            metadata = {}
            if embed_req.context_id:
                metadata["context_id"] = embed_req.context_id

            # Store in ChromaDB
            self.collection.add(
                ids=[embed_req.fact_id],
                embeddings=[embedding],
                documents=[embed_req.statement],
                metadatas=[metadata] if metadata else None
            )

            logger.info(f"Successfully embedded fact {embed_req.fact_id}")

            response = EmbedResponse(
                success=True,
                fact_id=embed_req.fact_id,
                message="Fact embedded successfully"
            )

            return response.model_dump()

        except Exception as e:
            logger.error(f"Error embedding fact: {e}", exc_info=True)
            return {
                "success": False,
                "fact_id": request.get("fact_id", "unknown"),
                "message": f"Error: {str(e)}"
            }

    def _handle_search(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """
        Handle search request.

        Args:
            request: Search request data

        Returns:
            Search response dictionary
        """
        try:
            # Validate request
            search_req = SearchRequest(**request)

            logger.info(f"Searching for: {search_req.query[:50]}...")

            # Generate query embedding
            query_embedding = self.provider.embed(search_req.query)

            # Prepare where filter if context_ids provided
            where_filter = None
            if search_req.context_ids:
                where_filter = {
                    "context_id": {"$in": search_req.context_ids}
                }

            # Query ChromaDB
            results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=search_req.limit,
                where=where_filter
            )

            # Format results
            search_results = []
            if results and results["ids"] and len(results["ids"]) > 0:
                for i, fact_id in enumerate(results["ids"][0]):
                    # ChromaDB returns distances, convert to similarity scores
                    # Lower distance = higher similarity
                    distance = results["distances"][0][i]
                    # Convert to similarity score
                    score = 1.0 / (1.0 + distance)

                    search_results.append(
                        SearchResult(
                            fact_id=fact_id,
                            score=round(score, 4),
                            statement=results["documents"][0][i]
                        )
                    )

            logger.info(f"Found {len(search_results)} results")

            response = SearchResponse(results=search_results)
            return response.model_dump()

        except Exception as e:
            logger.error(f"Error searching: {e}", exc_info=True)
            return {
                "results": [],
                "error": str(e)
            }

    def _handle_health(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """
        Handle health check request.

        Args:
            request: Health check request

        Returns:
            Health response dictionary
        """
        try:
            # Check ChromaDB connection
            try:
                self.chroma_client.heartbeat()
                chromadb_status = "connected"
            except Exception as e:
                logger.error(f"ChromaDB health check failed: {e}")
                chromadb_status = f"disconnected: {str(e)}"

            # Get provider info
            provider_name = self.provider.get_provider_name()
            embedding_dim = self.provider.get_embedding_dimension()

            # Overall status
            status = "healthy" if chromadb_status == "connected" else "degraded"

            response = HealthResponse(
                status=status,
                provider=provider_name,
                chromadb=chromadb_status,
                embedding_dimension=embedding_dim
            )

            return response.model_dump()

        except Exception as e:
            logger.error(f"Health check error: {e}", exc_info=True)
            return {
                "status": "unhealthy",
                "provider": "unknown",
                "chromadb": "unknown",
                "error": str(e)
            }


def verify_ollama_health(provider: EmbeddingProvider) -> bool:
    """
    Verify Ollama is healthy and ready to serve embeddings.

    Args:
        provider: The embedding provider instance

    Returns:
        True if healthy, False otherwise
    """
    import requests

    try:
        # Check if provider is OllamaProvider
        if provider.get_provider_name() != "ollama":
            return True  # Not Ollama, skip check

        # Get host from provider
        host = provider.host if hasattr(
            provider, 'host') else config.OLLAMA_HOST
        model = provider.model if hasattr(
            provider, 'model') else config.OLLAMA_MODEL

        logger.info("=" * 70)
        logger.info("Verifying Ollama health...")
        logger.info(f"  Host: {host}")
        logger.info(f"  Model: {model}")

        # Test 1: Check if Ollama API is reachable
        logger.info("  [1/3] Testing API connectivity...")
        response = requests.get(f"{host}/api/tags", timeout=5)
        response.raise_for_status()
        logger.info("  ✓ API is reachable")

        # Test 2: Verify model is available
        logger.info("  [2/3] Verifying model availability...")
        models_data = response.json()
        available_models = [m["name"].split(":")[0]
                            for m in models_data.get("models", [])]

        if model not in available_models:
            logger.error(f"  ✗ Model '{model}' not found on Ollama instance")
            logger.error(
                f"  Available models: {', '.join(available_models) if available_models else 'none'}")
            logger.error(f"  Pull the model with: ollama pull {model}")
            return False

        logger.info(f"  ✓ Model '{model}' is available")

        # Test 3: Generate a test embedding
        logger.info("  [3/3] Testing embedding generation...")
        test_embedding = provider.embed("health check test")
        dimension = len(test_embedding)
        logger.info(
            f"  ✓ Successfully generated test embedding (dimension: {dimension})")

        logger.info("=" * 70)
        logger.info("✓ Ollama is healthy and ready!")
        logger.info("=" * 70)

        return True

    except requests.exceptions.ConnectionError as e:
        logger.error("=" * 70)
        logger.error("✗ OLLAMA CONNECTION FAILED")
        logger.error(f"  Could not connect to Ollama at {host}")
        logger.error("  Is Ollama running? Start it with: ollama serve")
        logger.error("=" * 70)
        return False

    except requests.exceptions.Timeout as e:
        logger.error("=" * 70)
        logger.error("✗ OLLAMA CONNECTION TIMEOUT")
        logger.error(f"  Ollama at {host} is not responding")
        logger.error("  Check if Ollama is running: ollama serve")
        logger.error("=" * 70)
        return False

    except Exception as e:
        logger.error("=" * 70)
        logger.error("✗ OLLAMA HEALTH CHECK FAILED")
        logger.error(f"  Error: {str(e)}")
        logger.error("=" * 70)
        logger.exception("Detailed error:")
        return False


def main():
    """Main entry point for the RAG service."""
    logger.info("Starting RAG service...")
    logger.info(f"Provider: {config.EMBEDDING_PROVIDER}")
    logger.info(f"ChromaDB: {config.CHROMA_HOST}:{config.CHROMA_PORT}")

    # Log Ollama configuration if using Ollama provider
    if config.EMBEDDING_PROVIDER.lower() == "ollama":
        logger.info(f"Ollama Host: {config.OLLAMA_HOST}")
        logger.info(f"Ollama Model: {config.OLLAMA_MODEL}")

    # Validate configuration early
    try:
        config.validate()
    except Exception as e:
        logger.error(f"Configuration validation failed: {e}")
        sys.exit(1)

    # Create provider early to run health checks
    try:
        provider = create_provider_from_config(config)

        # Run Ollama health check if using Ollama provider
        if config.EMBEDDING_PROVIDER.lower() == "ollama":
            if not verify_ollama_health(provider):
                logger.error("Exiting due to Ollama health check failure")
                sys.exit(1)

    except Exception as e:
        logger.error(f"Failed to initialize provider: {e}")
        sys.exit(1)

    # Create LitServe API
    api = RAGServiceAPI(api_path="/")

    # Create server with multiple endpoint support
    server = ls.LitServer(
        api,
        accelerator="cpu",  # Embeddings typically run on CPU
        timeout=config.REQUEST_TIMEOUT,
    )

    # Start server
    logger.info(
        f"Server starting on {config.SERVICE_HOST}:{config.SERVICE_PORT}")
    server.run(
        port=config.SERVICE_PORT,
        host=config.SERVICE_HOST,
        generate_client_file=False
    )


if __name__ == "__main__":
    main()
