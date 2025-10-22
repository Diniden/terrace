# RAG Service Architecture

## Overview

This document describes the architecture and design decisions for the LitServe-based RAG (Retrieval-Augmented Generation) service.

## System Architecture

### High-Level Design

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Applications                      │
│            (HTTP Clients, Web Apps, Services)               │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    LitServe API Gateway                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ POST /embed  │  │ POST /search │  │  GET /health │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└───────────────────────────┬─────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Request    │    │  Embedding   │    │   Response   │
│  Validation  │───▶│  Generation  │───▶│   Encoding   │
│  (Pydantic)  │    │  (Provider)  │    │   (JSON)     │
└──────────────┘    └──────┬───────┘    └──────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
┌────────────┐    ┌────────────┐    ┌────────────┐
│   Claude   │    │   OpenAI   │    │   Ollama   │
│  Provider  │    │  Provider  │    │  Provider  │
└────────────┘    └────────────┘    └────────────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
                           ▼
                  ┌────────────────┐
                  │ Local Provider │
                  │  (sentence-    │
                  │  transformers) │
                  └────────┬───────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │    ChromaDB     │
                  │ Vector Database │
                  │  (Port 8000)    │
                  └─────────────────┘
```

## Core Components

### 1. LitServe API Layer (`rag_service.py`)

**Purpose**: Main microservice handling HTTP requests and orchestrating operations.

**Key Features**:
- Single LitAPI implementation with multi-endpoint routing
- Request validation using Pydantic models
- Error handling and logging
- Health monitoring

**Design Decisions**:
- **Why LitServe?**
  - Optimized for AI/ML workloads
  - Built-in batching and performance optimization
  - Simple, declarative API design
  - Lower overhead than FastAPI for serving models

- **Endpoint Design**:
  - `/embed`: Stateless, idempotent (can re-embed same fact)
  - `/search`: Read-only, no side effects
  - `/health`: Lightweight, no dependencies on heavy operations

**Request Flow**:
```
Client Request
    ↓
decode_request() - Parse and add endpoint info
    ↓
predict() - Route to appropriate handler
    ↓
_handle_embed() / _handle_search() / _handle_health()
    ↓
encode_response() - Format response
    ↓
Client Response
```

### 2. Embedding Provider Abstraction (`providers/`)

**Purpose**: Pluggable embedding generation supporting multiple backends.

**Architecture Pattern**: Strategy Pattern with Factory

**Components**:
- `base.py`: Abstract base class defining provider interface
- `local.py`: Local sentence-transformers implementation
- `openai.py`: OpenAI API client
- `claude.py`: Anthropic Claude client
- `ollama.py`: Ollama client
- `__init__.py`: Factory for provider instantiation

**Design Decisions**:

1. **Abstract Base Class**:
   ```python
   class EmbeddingProvider(ABC):
       @abstractmethod
       def embed(text: str) -> List[float]
       @abstractmethod
       def get_provider_name() -> str
       @abstractmethod
       def get_embedding_dimension() -> int
   ```

   - Forces consistent interface across providers
   - Allows easy addition of new providers
   - Enables polymorphic usage in service layer

2. **Batch Support**:
   - Default implementation: sequential processing
   - Providers can override for optimization (OpenAI, Local)
   - Transparent to calling code

3. **Provider Selection**:
   - Environment-driven configuration
   - Factory pattern for clean instantiation
   - Validation at startup (fail-fast)

**Embedding Dimensions**:
- Local (all-MiniLM-L6-v2): 384
- Local (all-mpnet-base-v2): 768
- OpenAI (text-embedding-3-small): 1536
- OpenAI (text-embedding-3-large): 3072
- Ollama (nomic-embed-text): 768
- Claude (custom): 1024

### 3. Configuration Management (`config.py`)

**Purpose**: Centralized configuration with validation and defaults.

**Design Decisions**:

1. **Environment-First**:
   - All config from environment variables
   - `.env` file support via python-dotenv
   - No hardcoded secrets

2. **Validation on Startup**:
   ```python
   config.validate()  # Called during service setup
   ```
   - Checks required API keys for selected provider
   - Fails fast if misconfigured
   - Clear error messages

3. **Singleton Pattern**:
   ```python
   config = Config()  # Single instance
   ```
   - Shared across all modules
   - Loaded once at import time
   - Immutable after initialization

### 4. ChromaDB Integration

**Purpose**: Vector storage and similarity search.

**Design Decisions**:

1. **Storage Schema**:
   ```python
   collection.add(
       ids=[fact_id],           # UUID as document ID
       embeddings=[vector],      # Embedding vector
       documents=[statement],    # Original fact text
       metadatas=[{context_id}]  # Context for filtering
   )
   ```

2. **Why Not Store Full Facts?**:
   - ChromaDB optimized for vectors, not documents
   - Reduces storage overhead
   - Faster queries (less data transfer)
   - Fact details can be fetched from primary database using returned ID

3. **Single Collection**:
   - All facts in one "facts" collection
   - Context filtering via metadata queries
   - Simpler to manage
   - Can be sharded later if needed

4. **Distance to Score Conversion**:
   ```python
   score = 1.0 / (1.0 + distance)
   ```
   - Lower distance = higher score
   - Normalized to [0, 1] range
   - Intuitive for clients

### 5. Request/Response Models

**Purpose**: Type-safe API contracts with validation.

**Pydantic Models**:
```python
class EmbedRequest(BaseModel):
    fact_id: str
    statement: str
    context_id: Optional[str] = None

class SearchRequest(BaseModel):
    query: str
    limit: int = 10
    context_ids: Optional[List[str]] = None
```

**Benefits**:
- Automatic validation
- Clear API documentation
- Type hints for IDE support
- Serialization/deserialization

## Data Flow

### Embedding Flow

```
1. Client sends POST /embed
   {
     "fact_id": "uuid",
     "statement": "text",
     "context_id": "context-id"
   }

2. Request validation (Pydantic)

3. Provider generates embedding
   provider.embed(statement) → [0.1, 0.2, ...]

4. Store in ChromaDB
   collection.add(
     ids=[fact_id],
     embeddings=[vector],
     documents=[statement],
     metadatas=[{context_id}]
   )

5. Return success response
   {
     "success": true,
     "fact_id": "uuid",
     "message": "Fact embedded successfully"
   }
```

### Search Flow

```
1. Client sends POST /search
   {
     "query": "natural language query",
     "limit": 10,
     "context_ids": ["context-1"]
   }

2. Request validation (Pydantic)

3. Provider generates query embedding
   provider.embed(query) → [0.3, 0.4, ...]

4. Search ChromaDB
   collection.query(
     query_embeddings=[query_vector],
     n_results=10,
     where={context_id: {$in: ["context-1"]}}
   )

5. Convert distances to scores
   score = 1.0 / (1.0 + distance)

6. Return ranked results
   {
     "results": [
       {
         "fact_id": "uuid",
         "score": 0.8542,
         "statement": "matching fact text"
       },
       ...
     ]
   }
```

## Design Patterns

### 1. Strategy Pattern (Embedding Providers)

**Problem**: Need to support multiple embedding backends without tight coupling.

**Solution**: Abstract provider interface with concrete implementations.

**Benefits**:
- Easy to add new providers
- Runtime provider selection
- Testable with mocks

### 2. Factory Pattern (Provider Creation)

**Problem**: Complex provider instantiation logic.

**Solution**: Factory function handling provider creation and configuration.

```python
def create_provider(provider_type, **kwargs) -> EmbeddingProvider:
    if provider_type == "openai":
        return OpenAIProvider(api_key=kwargs["api_key"])
    # ...
```

### 3. Singleton Pattern (Configuration)

**Problem**: Configuration needed across multiple modules.

**Solution**: Single config instance imported everywhere.

**Benefits**:
- Consistent configuration
- Single source of truth
- No passing config through layers

### 4. Dependency Injection (Testing)

**Problem**: Need to test without real API calls or databases.

**Solution**: Mock providers and ChromaDB client in tests.

```python
@patch('rag_service.create_provider_from_config')
def test_endpoint(mock_provider_factory):
    mock_provider = Mock()
    mock_provider.embed.return_value = [0.1] * 384
    mock_provider_factory.return_value = mock_provider
```

## Scalability Considerations

### Horizontal Scaling

**Current**: Single service instance

**Future**:
```
┌──────────────┐
│ Load Balancer│
└──────┬───────┘
       ├─────────────┬─────────────┐
       ▼             ▼             ▼
┌────────────┐ ┌────────────┐ ┌────────────┐
│ RAG Service│ │ RAG Service│ │ RAG Service│
│ Instance 1 │ │ Instance 2 │ │ Instance 3 │
└─────┬──────┘ └─────┬──────┘ └─────┬──────┘
      └──────────────┴──────────────┘
                     ▼
              ┌──────────────┐
              │  ChromaDB    │
              │   Cluster    │
              └──────────────┘
```

**Considerations**:
- Stateless service design (no session storage)
- Shared ChromaDB instance or cluster
- Load balancer with health checks
- Consider caching frequently accessed embeddings

### Performance Optimization

1. **Batch Embeddings**:
   ```python
   provider.embed_batch(texts)  # More efficient than loop
   ```

2. **Async Operations** (Future):
   - Convert to async/await for I/O operations
   - Parallel embedding generation
   - Non-blocking ChromaDB queries

3. **Caching**:
   - Cache embeddings for identical queries
   - TTL-based invalidation
   - Redis or in-memory cache

4. **Model Optimization**:
   - Use quantized models for local provider
   - GPU acceleration for larger models
   - Model serving with TensorRT/ONNX

## Error Handling Strategy

### Levels of Error Handling

1. **Request Validation** (Pydantic):
   - Invalid input format
   - Missing required fields
   - Type errors

2. **Provider Errors**:
   - API rate limits
   - Authentication failures
   - Network timeouts
   - Model loading failures

3. **ChromaDB Errors**:
   - Connection failures
   - Dimension mismatches
   - Query errors

4. **Service Errors**:
   - Unexpected exceptions
   - Resource exhaustion

### Error Response Format

```python
{
    "success": false,
    "error": "Clear error message",
    "error_type": "ValidationError | ProviderError | DatabaseError"
}
```

### Logging Strategy

```python
logger.info()    # Normal operations
logger.warning() # Degraded but functional
logger.error()   # Errors requiring attention
logger.debug()   # Detailed debugging
```

## Testing Strategy

### Test Pyramid

```
        ┌─────────────┐
        │ Integration │  Few, high-value workflows
        │    Tests    │
        └─────────────┘
      ┌─────────────────┐
      │  Component Tests│  Provider, ChromaDB interactions
      │                 │
      └─────────────────┘
    ┌───────────────────────┐
    │     Unit Tests        │  Provider logic, validation
    │                       │
    └───────────────────────┘
```

### Test Coverage

1. **Provider Tests** (`test_providers.py`):
   - Each provider with mocked backends
   - Embedding generation
   - Batch processing
   - Error handling

2. **ChromaDB Tests** (`test_chromadb.py`):
   - Add/query operations
   - Context filtering
   - Error scenarios

3. **Endpoint Tests** (`test_endpoints.py`):
   - Each endpoint individually
   - End-to-end workflows
   - Error responses

### Mocking Strategy

- Mock external APIs (OpenAI, Claude, Ollama)
- Mock ChromaDB client
- Use fixtures for common test data
- Avoid mocking internal logic

## Security Considerations

### Current Implementation

1. **No API Keys in Code**: All from environment
2. **No Authentication**: Public endpoints (MVP)
3. **Input Validation**: Pydantic models
4. **Error Messages**: No sensitive info in responses

### Production Requirements

1. **Authentication**:
   - API key or JWT tokens
   - Rate limiting per client
   - Request signing

2. **Authorization**:
   - Context-based access control
   - Fact ownership
   - Read/write permissions

3. **Input Sanitization**:
   - SQL injection prevention (N/A for vector DB)
   - XSS prevention (if serving web UI)
   - Max input length limits

4. **Secrets Management**:
   - Use AWS Secrets Manager, Vault, etc.
   - Rotate API keys regularly
   - Audit access logs

## Deployment Architecture

### Local Development

```bash
python3 rag_service.py
# + ChromaDB local instance
```

### Docker Deployment

```yaml
services:
  chromadb:
    image: chromadb/chroma
  rag-service:
    build: .
    depends_on: chromadb
```

### Production Kubernetes

```
┌─────────────────────────────────────┐
│          Kubernetes Cluster         │
│                                     │
│  ┌────────────────────────────┐   │
│  │  RAG Service Deployment    │   │
│  │  (3 replicas)              │   │
│  └────────────────────────────┘   │
│                                     │
│  ┌────────────────────────────┐   │
│  │  ChromaDB StatefulSet      │   │
│  │  (Persistent Volume)       │   │
│  └────────────────────────────┘   │
│                                     │
│  ┌────────────────────────────┐   │
│  │  ConfigMap (env vars)      │   │
│  └────────────────────────────┘   │
│                                     │
│  ┌────────────────────────────┐   │
│  │  Secrets (API keys)        │   │
│  └────────────────────────────┘   │
└─────────────────────────────────────┘
```

## Future Enhancements

### Short Term

1. **Async Operations**: Convert to async for better performance
2. **Batch Endpoints**: `/embed_batch` for multiple facts
3. **Pagination**: For large search results
4. **Metrics**: Prometheus metrics for monitoring

### Medium Term

1. **Caching Layer**: Redis for query caching
2. **Authentication**: API key or OAuth
3. **Rate Limiting**: Per-client limits
4. **Reranking**: Two-stage retrieval with reranking

### Long Term

1. **Hybrid Search**: Combine semantic + keyword search
2. **Multi-Collection**: Separate collections per domain
3. **Real-time Updates**: Streaming updates to embeddings
4. **A/B Testing**: Compare embedding models

## Conclusion

This architecture provides:
- **Flexibility**: Multiple embedding providers
- **Scalability**: Stateless, horizontally scalable design
- **Maintainability**: Clean separation of concerns
- **Testability**: Comprehensive mocking and testing
- **Production-Ready**: Error handling, logging, health checks

The LitServe framework and provider abstraction make this a robust foundation for a production RAG service.
