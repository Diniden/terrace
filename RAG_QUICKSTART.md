# RAG Feature - Quick Start Guide

## 1. Setup Environment

```bash
# Copy environment template
cp backend/.env.example backend/.env

# Edit backend/.env and set:
# - EMBEDDING_PROVIDER=local (or openai, claude, ollama)
# - Add API keys if using cloud providers
```

## 2. Start Services

### Option A: All Services (Recommended)

```bash
# Start everything with mprocs
mprocs

# This starts:
# - postgres (database)
# - chromadb (vector database)
# - rag-service (Python embedding service)
# - backend (NestJS API)
# - frontend (React app)
# - storybook (component library)
```

### Option B: Individual Services

```bash
# Terminal 1: Start ChromaDB
docker-compose up chromadb

# Terminal 2: Start RAG Service
cd python
venv/bin/python rag_service.py

# Terminal 3: Start Backend
cd backend
npm run start:dev
```

## 3. Verify Services

```bash
# Check ChromaDB
curl http://localhost:8000/api/v1/heartbeat

# Check RAG Service
curl http://localhost:8001/health

# Expected: {"status": "healthy", "provider": "local", "chromadb": "connected"}
```

## 4. Common Operations

### Check Embedding Status

```bash
cd backend

# Basic status
npm run rag:status

# Detailed status (shows failed embeddings)
npm run rag:status:detailed
```

### Re-embed Facts

```bash
# Re-embed all facts
npm run rag:re-embed

# Re-embed only failed facts
npm run rag:re-embed:failed

# Re-embed with limit
bun run scripts/re-embed-facts.ts --limit=100
```

### Reset ChromaDB

```bash
# Reset with confirmation prompt
npm run rag:reset

# Reset without prompt (use with caution)
npm run rag:reset:confirm
```

## 5. Troubleshooting

### ChromaDB won't start
```bash
# Check port 8000 is available
lsof -i :8000

# View logs
docker logs terrace-chromadb
```

### RAG Service can't connect to ChromaDB
```bash
# Verify ChromaDB is running
docker-compose ps chromadb

# Check environment variables in mprocs.yaml
# Ensure CHROMA_HOST and CHROMA_PORT are correct
```

### Scripts fail with database error
```bash
# Verify PostgreSQL is running
docker-compose ps postgres

# Check DATABASE_* variables in backend/.env
```

## 6. Service URLs

- ChromaDB: http://localhost:8000
- ChromaDB Heartbeat: http://localhost:8000/api/v1/heartbeat
- RAG Service Health: http://localhost:8001/health
- RAG Embed Endpoint: http://localhost:8001/embed
- RAG Search Endpoint: http://localhost:8001/search
- Backend API: http://localhost:3000
- Frontend: http://localhost:5173

## 7. Configuration Files

- `docker-compose.yml` - ChromaDB service definition
- `mprocs.yaml` - Multi-process orchestration (includes RAG service)
- `backend/.env` - Environment variables (copy from .env.example)
- `backend/scripts/` - Utility scripts for managing embeddings

## 8. Available Scripts (in backend/)

```bash
npm run rag:status              # Check embedding status
npm run rag:status:detailed     # Check with failed details
npm run rag:re-embed            # Re-embed all facts
npm run rag:re-embed:failed     # Re-embed failed facts
npm run rag:re-embed:pending    # Re-embed pending facts
npm run rag:reset               # Reset ChromaDB (with prompt)
npm run rag:reset:confirm       # Reset ChromaDB (no prompt)
```

## 9. Embedding Providers

### Local (Default)
```env
EMBEDDING_PROVIDER=local
LOCAL_MODEL_NAME=all-MiniLM-L6-v2
```
- No API key required
- Runs locally on CPU
- Fast for development

### OpenAI
```env
EMBEDDING_PROVIDER=openai
OPENAI_API_KEY=sk-...
```
- Requires OpenAI API key
- Uses text-embedding-3-small model
- Cost per request

### Claude/Anthropic
```env
EMBEDDING_PROVIDER=claude
ANTHROPIC_API_KEY=sk-ant-...
```
- Requires Anthropic API key
- Uses Claude 3.5 Sonnet
- Cost per request

### Ollama
```env
EMBEDDING_PROVIDER=ollama
OLLAMA_HOST=http://localhost:11434
```
- Requires Ollama running locally
- Uses nomic-embed-text model
- Free, runs locally

## 10. Next Steps

1. Create some facts via the backend API
2. Check embedding status: `npm run rag:status`
3. Test semantic search via RAG service
4. Explore the comprehensive documentation in `DEVOPS_RAG_SETUP.md`

For detailed documentation, see [DEVOPS_RAG_SETUP.md](./DEVOPS_RAG_SETUP.md)
