# RAG Service - LitServe-based Fact Embedding and Semantic Retrieval

A production-ready RAG (Retrieval-Augmented Generation) service built with LitServe for embedding fact statements and performing semantic search. Supports multiple embedding providers and uses ChromaDB for vector storage.

## Features

- **LitServe Microservice Architecture**: Fast, scalable API service
- **Multiple Embedding Providers**: Claude, OpenAI, Ollama, and local models
- **ChromaDB Vector Storage**: Persistent, scalable vector database
- **Context-based Filtering**: Organize and filter facts by context
- **Production-Ready**: Comprehensive error handling, logging, and testing

## Architecture

```
┌─────────────────┐
│   LitServe API  │
│   (Port 8080)   │
└────────┬────────┘
         │
         ├─────────────┬─────────────┬──────────────┐
         ▼             ▼             ▼              ▼
    ┌─────────┐  ┌─────────┐  ┌──────────┐  ┌──────────┐
    │ Claude  │  │ OpenAI  │  │  Ollama  │  │  Local   │
    │Provider │  │Provider │  │ Provider │  │ Provider │
    └─────────┘  └─────────┘  └──────────┘  └──────────┘
         │             │             │              │
         └─────────────┴─────────────┴──────────────┘
                              │
                              ▼
                      ┌──────────────┐
                      │   ChromaDB   │
                      │  (Port 8000) │
                      └──────────────┘
```

## Quick Start

### Prerequisites

- Python 3.9 or higher
- ChromaDB instance (local or remote)
- API keys for cloud providers (optional)

### 1. Environment Setup

```bash
# Navigate to the python directory
cd /home/user/terrace/python

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Install dependencies
pip3 install -r requirements.txt

# Go to torch documentation for installing torch correctly on your machine
```

### 2. Start ChromaDB

```bash
# Using Docker (recommended)
docker run -p 8000:8000 chromadb/chroma:latest

# Or install and run locally
pip3 install chromadb
chroma run --host localhost --port 8000
```

### 3. Configure Environment

Create a `.env` file (see `.env.example` for template):

```bash
# Embedding provider (claude | openai | ollama | local)
EMBEDDING_PROVIDER=local

# Local model settings (default provider)
LOCAL_MODEL_NAME=all-MiniLM-L6-v2

# ChromaDB settings
CHROMA_HOST=localhost
CHROMA_PORT=8000

# Service settings
SERVICE_HOST=0.0.0.0
SERVICE_PORT=8080
LOG_LEVEL=INFO
```

### 4. Start the Service

```bash
python3 rag_service.py
```

The service will start on `http://localhost:8080`

## API Endpoints

### POST /embed - Embed a Fact

Embed a fact statement into the vector database.

**Request:**

```json
{
  "fact_id": "fact-uuid-001",
  "statement": "The Earth orbits the Sun in approximately 365.25 days.",
  "context_id": "context-astronomy"
}
```

**Response:**

```json
{
  "success": true,
  "fact_id": "fact-uuid-001",
  "message": "Fact embedded successfully"
}
```

**Example:**

```bash
curl -X POST http://localhost:8080/embed \
  -H "Content-Type: application/json" \
  -d '{
    "fact_id": "fact-001",
    "statement": "Water boils at 100 degrees Celsius at sea level.",
    "context_id": "context-physics"
  }'
```

### POST /search - Search for Facts

Perform semantic search to find similar facts.

**Request:**

```json
{
  "query": "How long does Earth take to orbit the Sun?",
  "limit": 10,
  "context_ids": ["context-astronomy"]
}
```

**Response:**

```json
{
  "results": [
    {
      "fact_id": "fact-uuid-001",
      "score": 0.8542,
      "statement": "The Earth orbits the Sun in approximately 365.25 days."
    }
  ]
}
```

**Example:**

```bash
curl -X POST http://localhost:8080/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "boiling point of water",
    "limit": 5
  }'
```

### GET /health - Health Check

Check service health and configuration.

**Response:**

```json
{
  "status": "healthy",
  "provider": "local",
  "chromadb": "connected",
  "embedding_dimension": 384
}
```

**Example:**

```bash
curl http://localhost:8080/health
```

## Embedding Providers

### Local Provider (Default)

Uses sentence-transformers for local embedding generation. No API keys required.

**Configuration:**

```bash
EMBEDDING_PROVIDER=local
LOCAL_MODEL_NAME=all-MiniLM-L6-v2
```

**Recommended Models:**

- `all-MiniLM-L6-v2`: Fast, lightweight (384 dimensions, ~80MB)
- `all-mpnet-base-v2`: Better quality (768 dimensions, ~420MB)
- `paraphrase-multilingual-MiniLM-L12-v2`: Multilingual support

### OpenAI Provider

Uses OpenAI's embedding API. Requires API key.

**Configuration:**

```bash
EMBEDDING_PROVIDER=openai
OPENAI_API_KEY=your-api-key-here
```

**Models:**

- `text-embedding-3-small`: 1536 dimensions (default)
- `text-embedding-3-large`: 3072 dimensions

### Claude Provider

Uses Anthropic's Claude API. This is a demonstration implementation using Claude's text generation for embeddings.

**Configuration:**

```bash
EMBEDDING_PROVIDER=claude
ANTHROPIC_API_KEY=your-api-key-here
```

**Note:** Claude doesn't have a native embedding endpoint. For production, use OpenAI or local models.

### Ollama Provider

Connects to an Ollama instance (local or remote) for embedding generation.

**Configuration:**

```bash
EMBEDDING_PROVIDER=ollama
OLLAMA_HOST=http://localhost:11434
```

**Setup Ollama:**

```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull embedding model
ollama pull nomic-embed-text

# Ollama runs automatically on port 11434
```

## Testing

### Run All Tests

```bash
# Run all tests
pytest tests/ -v

# Run with coverage
pytest tests/ --cov=. --cov-report=html

# Run specific test file
pytest tests/test_providers.py -v
```

### Test Categories

- `test_providers.py`: Tests for all embedding providers
- `test_chromadb.py`: Tests for ChromaDB integration
- `test_endpoints.py`: Tests for API endpoints and workflows

### Example Test Output

```
tests/test_providers.py::TestLocalProvider::test_embed PASSED
tests/test_chromadb.py::TestChromaDBIntegration::test_query_embeddings PASSED
tests/test_endpoints.py::TestRAGServiceEndpoints::test_search_endpoint PASSED
```

## Configuration Options

### Environment Variables

| Variable                   | Default                  | Description                                  |
| -------------------------- | ------------------------ | -------------------------------------------- |
| `EMBEDDING_PROVIDER`       | `local`                  | Provider type: claude, openai, ollama, local |
| `ANTHROPIC_API_KEY`        | -                        | API key for Claude provider                  |
| `OPENAI_API_KEY`           | -                        | API key for OpenAI provider                  |
| `OLLAMA_HOST`              | `http://localhost:11434` | Ollama instance URL                          |
| `LOCAL_MODEL_NAME`         | `all-MiniLM-L6-v2`       | HuggingFace model for local provider         |
| `CHROMA_HOST`              | `localhost`              | ChromaDB host                                |
| `CHROMA_PORT`              | `8000`                   | ChromaDB port                                |
| `CHROMA_PERSIST_DIRECTORY` | `./chroma_db`            | Local persistence directory                  |
| `SERVICE_HOST`             | `0.0.0.0`                | Service bind address                         |
| `SERVICE_PORT`             | `8080`                   | Service port                                 |
| `LOG_LEVEL`                | `INFO`                   | Logging level                                |
| `REQUEST_TIMEOUT`          | `30`                     | Request timeout in seconds                   |

## Project Structure

```
python/
├── rag_service.py          # Main LitServe API
├── config.py               # Configuration management
├── requirements.txt        # Python dependencies
├── providers/
│   ├── __init__.py        # Provider factory
│   ├── base.py            # Abstract base provider
│   ├── claude.py          # Claude provider
│   ├── openai.py          # OpenAI provider
│   ├── ollama.py          # Ollama provider
│   └── local.py           # Local models provider
├── tests/
│   ├── __init__.py        # Test fixtures
│   ├── test_providers.py  # Provider tests
│   ├── test_chromadb.py   # ChromaDB tests
│   └── test_endpoints.py  # Endpoint tests
└── README.md              # This file
```

## Troubleshooting

### ChromaDB Connection Issues

```bash
# Check if ChromaDB is running
curl http://localhost:8000/api/v1/heartbeat

# Verify ChromaDB configuration
docker logs <chromadb-container-id>
```

### Local Model Download Issues

Local models are downloaded from HuggingFace on first use. Ensure you have:

- Internet connection
- Sufficient disk space (~80MB-500MB per model)
- Write permissions in the cache directory

```bash
# Set custom cache directory
export TRANSFORMERS_CACHE=/path/to/cache
```

### Provider Configuration Errors

```bash
# Validate configuration
python3 -c "from config import config; config.validate()"
```

### Memory Issues with Large Models

Local models require RAM:

- `all-MiniLM-L6-v2`: ~500MB RAM
- `all-mpnet-base-v2`: ~1.5GB RAM

Use smaller models or cloud providers if memory is limited.

## Performance Considerations

### Embedding Generation

| Provider | Latency    | Cost            | Quality           |
| -------- | ---------- | --------------- | ----------------- |
| Local    | 50-200ms   | Free            | Good              |
| OpenAI   | 100-300ms  | $0.02/1M tokens | Excellent         |
| Ollama   | 100-500ms  | Free            | Good              |
| Claude   | 500-1500ms | $3/1M tokens    | Good (workaround) |

### Scaling

- **Horizontal**: Run multiple service instances behind a load balancer
- **Batch Processing**: Use `embed_batch()` for multiple facts
- **Caching**: ChromaDB provides built-in caching for queries

## Production Deployment

### Docker Deployment

Create a `Dockerfile`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8080

CMD ["python3", "rag_service.py"]
```

Build and run:

```bash
docker build -t rag-service .
docker run -p 8080:8080 --env-file .env rag-service
```

### Docker Compose

See `docker-compose.yml` for a complete setup with ChromaDB.

## License

This project is part of the Terrace platform.

## Support

For issues and questions:

- Check the troubleshooting section
- Review test files for usage examples
- Consult provider documentation for API-specific issues
