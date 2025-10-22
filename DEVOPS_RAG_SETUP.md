# DevOps RAG Infrastructure Setup

This document describes the DevOps infrastructure setup for the RAG (Retrieval-Augmented Generation) feature integration.

## Table of Contents

1. [Overview](#overview)
2. [Infrastructure Components](#infrastructure-components)
3. [Quick Start](#quick-start)
4. [Configuration](#configuration)
5. [Utility Scripts](#utility-scripts)
6. [Verification Checklist](#verification-checklist)
7. [Troubleshooting](#troubleshooting)

---

## Overview

The RAG feature infrastructure consists of:

- **ChromaDB**: Vector database for storing fact embeddings
- **Python RAG Service**: LitServe-based API for embedding generation and semantic search
- **Utility Scripts**: Bun/TypeScript scripts for managing embeddings

All services are orchestrated via Docker Compose and mprocs for seamless development workflow.

---

## Infrastructure Components

### 1. ChromaDB (Docker)

**Service**: `chromadb`
**Image**: `chromadb/chroma:0.4.22`
**Port**: 8000 (configurable via `CHROMA_PORT`)
**Storage**: Persistent volume at `./data/chromadb`

**Features**:
- Persistent storage (not in-memory)
- Health check endpoint: `http://localhost:8000/api/v1/heartbeat`
- Auto-restart on failure
- Graceful shutdown

**Configuration** (docker-compose.yml):
```yaml
chromadb:
  image: chromadb/chroma:0.4.22
  container_name: terrace-chromadb
  restart: unless-stopped
  ports:
    - "${CHROMA_PORT:-8000}:8000"
  volumes:
    - chromadb_data:/chroma/chroma
  environment:
    - IS_PERSISTENT=TRUE
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:8000/api/v1/heartbeat"]
```

### 2. Python RAG Service (mprocs)

**Service**: `rag-service`
**Port**: 8001 (configurable via `SERVICE_PORT`)
**Runtime**: Python 3.x via venv

**Features**:
- Embedding generation (`/embed`)
- Semantic search (`/search`)
- Health checks (`/health`)
- Multiple embedding providers (local, OpenAI, Claude, Ollama)

**Configuration** (mprocs.yaml):
```yaml
rag-service:
  shell: "python/venv/bin/python python/rag_service.py"
  env:
    CHROMA_HOST: localhost
    CHROMA_PORT: "8000"
    EMBEDDING_PROVIDER: local
    SERVICE_PORT: "8001"
```

### 3. Utility Scripts

Three Bun/TypeScript scripts for managing embeddings:

| Script | Purpose | Command |
|--------|---------|---------|
| `check-embedding-status.ts` | Check embedding coverage and statistics | `npm run rag:status` |
| `re-embed-facts.ts` | Re-embed facts (all, failed, or by corpus) | `npm run rag:re-embed` |
| `reset-chromadb.ts` | Clear all embeddings and reset status | `npm run rag:reset` |

---

## Quick Start

### 1. Environment Setup

Copy the environment template:

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` and configure:
```env
# ChromaDB
CHROMA_HOST=localhost
CHROMA_PORT=8000

# RAG Service
RAG_SERVICE_URL=http://localhost:8001
RAG_SERVICE_ENABLED=true

# Embedding Provider (local, openai, claude, ollama)
EMBEDDING_PROVIDER=local
```

### 2. Start Infrastructure

#### Option A: Using Docker Compose (Individual Services)

```bash
# Start ChromaDB
docker-compose up chromadb

# Start PostgreSQL (if not running)
docker-compose up postgres
```

#### Option B: Using mprocs (All Services)

```bash
# Start all services including ChromaDB and RAG service
mprocs
```

The mprocs configuration will automatically start:
- postgres
- chromadb
- rag-service
- backend
- frontend
- storybook

### 3. Verify Services

```bash
# Check ChromaDB health
curl http://localhost:8000/api/v1/heartbeat
# Expected: 200 OK with JSON response

# Check RAG service health
curl http://localhost:8001/health
# Expected: {"status": "healthy", "provider": "local", "chromadb": "connected"}
```

### 4. Run Utility Scripts

```bash
# Check embedding status
cd backend
npm run rag:status

# Re-embed failed facts
npm run rag:re-embed:failed

# View detailed status
npm run rag:status:detailed
```

---

## Configuration

### Environment Variables

All environment variables are documented in `backend/.env.example`.

#### ChromaDB Configuration

```env
CHROMA_HOST=localhost          # ChromaDB host
CHROMA_PORT=8000              # ChromaDB port
CHROMA_COLLECTION_NAME=facts  # Collection name for fact embeddings
```

#### RAG Service Configuration

```env
RAG_SERVICE_URL=http://localhost:8001  # RAG service endpoint
RAG_SERVICE_ENABLED=true               # Enable/disable RAG features
```

#### Embedding Provider Configuration

```env
# Provider selection (local, openai, claude, ollama)
EMBEDDING_PROVIDER=local

# OpenAI (if using openai provider)
OPENAI_API_KEY=sk-...

# Claude/Anthropic (if using claude provider)
ANTHROPIC_API_KEY=sk-ant-...

# Ollama (if using ollama provider)
OLLAMA_HOST=http://localhost:11434

# Local model settings (if using local provider)
LOCAL_MODEL_NAME=all-MiniLM-L6-v2
```

### Python Virtual Environment

The RAG service uses a Python virtual environment:

```bash
# Setup (one-time)
cd python
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

The mprocs configuration uses the venv directly without activation:
```yaml
shell: "python/venv/bin/python python/rag_service.py"
```

---

## Utility Scripts

### 1. Check Embedding Status

**Script**: `backend/scripts/check-embedding-status.ts`

**Purpose**: Display embedding coverage and statistics.

**Usage**:
```bash
# Basic status
npm run rag:status

# Detailed status (includes failed embeddings)
npm run rag:status:detailed

# Status for specific corpus
bun run scripts/check-embedding-status.ts --corpus=<corpus-id>
```

**Output**:
```
Overall Statistics:
  Total Facts:     150
  Embedded:        145
  Pending:         3
  Failed:          2
  Completion:      [████████████████████] 97%

Breakdown by Corpus:
  Knowledge Base (uuid-1)
    Facts: 100 | Embedded: 98 | Pending: 2 | Failed: 0
    [███████████████████░] 98%
```

### 2. Re-embed Facts

**Script**: `backend/scripts/re-embed-facts.ts`

**Purpose**: Re-embed facts (useful for updating embeddings or retrying failures).

**Usage**:
```bash
# Re-embed all facts
npm run rag:re-embed

# Re-embed only failed facts
npm run rag:re-embed:failed

# Re-embed only pending facts
npm run rag:re-embed:pending

# Re-embed facts in a specific corpus
bun run scripts/re-embed-facts.ts --corpus=<corpus-id>

# Limit number of facts
bun run scripts/re-embed-facts.ts --limit=100

# Dry run (preview without executing)
bun run scripts/re-embed-facts.ts --dry-run
```

**Output**:
```
Re-embedding Facts

Checking RAG service at http://localhost:8001/health...
RAG service is running

Found 3 facts to re-embed

[1/3] Re-embedding fact uuid-1...
[1/3] Success
[2/3] Re-embedding fact uuid-2...
[2/3] Success
[3/3] Re-embedding fact uuid-3...
[3/3] Success

Summary:
  Total:    3
  Success:  3
  Failed:   0
```

### 3. Reset ChromaDB

**Script**: `backend/scripts/reset-chromadb.ts`

**Purpose**: Clear all embeddings and reset fact status to pending.

**Usage**:
```bash
# Reset with confirmation prompt
npm run rag:reset

# Reset without confirmation (use with caution!)
npm run rag:reset:confirm

# Reset only a specific corpus
bun run scripts/reset-chromadb.ts --corpus=<corpus-id>
```

**Safety**:
- Prompts for confirmation by default
- Use `--confirm` flag to skip prompt (for automation)
- Resets fact status in database to 'pending'

**Output**:
```
Reset ChromaDB

WARNING: This will delete ALL embeddings from ChromaDB
and reset fact embedding status to 'pending' in the database.

Are you sure you want to proceed? (yes/no): yes

Checking ChromaDB at http://localhost:8000/api/v1/heartbeat...
ChromaDB is running

Deleting ChromaDB collection: facts
Deleted ChromaDB collection

Recreating empty collection: facts
Created empty collection

Resetting all fact embedding statuses in database
Reset 150 facts to pending status

ChromaDB reset complete
```

---

## Verification Checklist

Use this checklist to verify the RAG infrastructure setup:

### Docker Services

- [ ] **ChromaDB starts successfully**
  ```bash
  docker-compose up chromadb
  # Should start without errors
  ```

- [ ] **ChromaDB health check responds**
  ```bash
  curl http://localhost:8000/api/v1/heartbeat
  # Expected: {"nanosecond heartbeat": <number>}
  ```

- [ ] **ChromaDB volume persists data**
  ```bash
  docker-compose down
  docker-compose up chromadb
  # Data should persist across restarts
  ```

- [ ] **ChromaDB logs show no errors**
  ```bash
  docker logs terrace-chromadb
  # Should show "Application startup complete"
  ```

### Python RAG Service (mprocs)

- [ ] **RAG service starts without errors**
  ```bash
  mprocs
  # Check rag-service panel for startup logs
  ```

- [ ] **RAG service health endpoint responds**
  ```bash
  curl http://localhost:8001/health
  # Expected: {"status": "healthy", "provider": "local", ...}
  ```

- [ ] **RAG service can embed a fact**
  ```bash
  curl -X POST http://localhost:8001/embed \
    -H "Content-Type: application/json" \
    -d '{
      "fact_id": "test-uuid",
      "statement": "This is a test fact"
    }'
  # Expected: {"success": true, "fact_id": "test-uuid", ...}
  ```

- [ ] **RAG service can search**
  ```bash
  curl -X POST http://localhost:8001/search \
    -H "Content-Type: application/json" \
    -d '{
      "query": "test",
      "limit": 5
    }'
  # Expected: {"results": [...]}
  ```

- [ ] **Environment variables are set correctly**
  ```bash
  # In mprocs rag-service panel, check logs for:
  # "Provider: local"
  # "ChromaDB: localhost:8000"
  ```

- [ ] **Service restarts on failure**
  ```bash
  # Kill the process and verify mprocs restarts it
  # (This is automatic with mprocs configuration)
  ```

### Utility Scripts

- [ ] **check-embedding-status.ts runs successfully**
  ```bash
  cd backend
  npm run rag:status
  # Should display statistics without errors
  ```

- [ ] **check-embedding-status.ts shows correct counts**
  ```bash
  npm run rag:status
  # Verify counts match database
  ```

- [ ] **re-embed-facts.ts can re-embed facts**
  ```bash
  npm run rag:re-embed -- --limit=1
  # Should successfully re-embed 1 fact
  ```

- [ ] **re-embed-facts.ts handles RAG service down**
  ```bash
  # Stop RAG service
  npm run rag:re-embed -- --limit=1
  # Should show error: "RAG service is not running"
  ```

- [ ] **reset-chromadb.ts prompts for confirmation**
  ```bash
  npm run rag:reset
  # Should prompt: "Are you sure you want to proceed?"
  ```

- [ ] **reset-chromadb.ts clears embeddings**
  ```bash
  npm run rag:reset:confirm
  npm run rag:status
  # All facts should show as "pending"
  ```

### Integration Tests

- [ ] **Backend can connect to RAG service**
  ```bash
  # Start backend and check logs for RAG service connection
  cd backend
  npm run start:dev
  # Logs should not show RAG service errors
  ```

- [ ] **Facts are embedded on creation (if enabled)**
  ```bash
  # Create a fact via API
  # Check ChromaDB for the embedding
  curl http://localhost:8000/api/v1/collections/facts/count
  # Count should increment
  ```

- [ ] **Semantic search returns results**
  ```bash
  # Create some facts with embeddings
  # Test search via RAG service
  curl -X POST http://localhost:8001/search \
    -H "Content-Type: application/json" \
    -d '{"query": "your search query", "limit": 5}'
  # Should return relevant facts
  ```

### Production Readiness

- [ ] **Environment variables are documented**
  - All variables in `.env.example`
  - Comments explain purpose

- [ ] **Secrets are not in source control**
  - `.env` is in `.gitignore`
  - No hardcoded API keys

- [ ] **ChromaDB port not exposed publicly**
  - Port 8000 only accessible on localhost
  - Consider firewall rules for production

- [ ] **Scripts have proper error handling**
  - Scripts exit with non-zero on errors
  - Clear error messages displayed

- [ ] **Documentation is complete**
  - This file (DEVOPS_RAG_SETUP.md)
  - Inline script documentation
  - README.md updated with RAG info

---

## Troubleshooting

### ChromaDB Issues

**Problem**: ChromaDB fails to start with "address already in use"

**Solution**:
```bash
# Check what's using port 8000
lsof -i :8000
# Kill the process or change CHROMA_PORT in .env
```

---

**Problem**: ChromaDB data not persisting across restarts

**Solution**:
```bash
# Check volume configuration
docker volume inspect terrace_chromadb_data

# Verify IS_PERSISTENT=TRUE in docker-compose.yml
docker-compose config | grep -A 5 chromadb
```

---

**Problem**: ChromaDB health check fails

**Solution**:
```bash
# Check ChromaDB logs
docker logs terrace-chromadb

# Verify network connectivity
docker-compose exec chromadb curl http://localhost:8000/api/v1/heartbeat

# Restart ChromaDB
docker-compose restart chromadb
```

---

### Python RAG Service Issues

**Problem**: RAG service fails to start with "No module named 'litserve'"

**Solution**:
```bash
# Reinstall Python dependencies
cd python
source venv/bin/activate
pip install -r requirements.txt
```

---

**Problem**: RAG service can't connect to ChromaDB

**Solution**:
```bash
# Verify ChromaDB is running
curl http://localhost:8000/api/v1/heartbeat

# Check CHROMA_HOST and CHROMA_PORT in mprocs.yaml
# Ensure they match ChromaDB configuration

# Check RAG service logs in mprocs
# Should see "Connected to ChromaDB at localhost:8000"
```

---

**Problem**: RAG service uses wrong embedding provider

**Solution**:
```bash
# Check EMBEDDING_PROVIDER in mprocs.yaml
# Verify API keys are set for cloud providers (OpenAI, Claude)

# Check RAG service logs for provider initialization
# Should see "Initialized embedding provider: <provider-name>"
```

---

### Script Issues

**Problem**: Scripts fail with "Database connection refused"

**Solution**:
```bash
# Verify PostgreSQL is running
docker-compose ps postgres

# Check DATABASE_* variables in backend/.env
# Ensure they match docker-compose.yml

# Test connection manually
psql -h localhost -U terrace -d terrace
```

---

**Problem**: re-embed-facts.ts fails with "RAG service is not running"

**Solution**:
```bash
# Check RAG service status
curl http://localhost:8001/health

# Start RAG service via mprocs
mprocs

# Or start manually
cd python
venv/bin/python rag_service.py
```

---

**Problem**: Scripts show "Permission denied"

**Solution**:
```bash
# Make scripts executable
chmod +x backend/scripts/*.ts
```

---

### Performance Issues

**Problem**: Embedding generation is slow

**Solution**:
- Use local provider for development (fastest)
- Switch to GPU-accelerated models for production
- Batch embed multiple facts (future enhancement)
- Consider caching embeddings

---

**Problem**: ChromaDB uses too much memory

**Solution**:
- Limit collection size
- Use smaller embedding models
- Configure ChromaDB memory limits in docker-compose.yml

---

## Appendix

### Package.json Scripts Reference

```json
{
  "rag:status": "Check embedding status",
  "rag:status:detailed": "Check embedding status with failed details",
  "rag:re-embed": "Re-embed all facts",
  "rag:re-embed:failed": "Re-embed only failed facts",
  "rag:re-embed:pending": "Re-embed only pending facts",
  "rag:reset": "Reset ChromaDB with confirmation",
  "rag:reset:confirm": "Reset ChromaDB without confirmation"
}
```

### Service URLs

- **ChromaDB**: http://localhost:8000
- **ChromaDB API**: http://localhost:8000/api/v1
- **ChromaDB Heartbeat**: http://localhost:8000/api/v1/heartbeat
- **RAG Service**: http://localhost:8001
- **RAG Health**: http://localhost:8001/health
- **RAG Embed**: http://localhost:8001/embed
- **RAG Search**: http://localhost:8001/search

### Useful Commands

```bash
# View all Docker containers
docker-compose ps

# View ChromaDB logs
docker logs -f terrace-chromadb

# View ChromaDB data volume
docker volume inspect terrace_chromadb_data

# Clear ChromaDB volume (WARNING: deletes all data)
docker-compose down -v

# Restart specific service
docker-compose restart chromadb

# Check Python dependencies
cd python && venv/bin/pip list

# Test embedding manually
curl -X POST http://localhost:8001/embed \
  -H "Content-Type: application/json" \
  -d '{"fact_id": "test-id", "statement": "Test statement"}'

# Test search manually
curl -X POST http://localhost:8001/search \
  -H "Content-Type: application/json" \
  -d '{"query": "test query", "limit": 5}'
```

---

## Summary

The RAG infrastructure is now fully configured with:

1. **ChromaDB**: Persistent vector database running in Docker
2. **Python RAG Service**: LitServe-based embedding and search API
3. **Utility Scripts**: Management tools for embeddings
4. **Environment Configuration**: Complete .env.example with all variables
5. **mprocs Integration**: Seamless multi-service development workflow

All components are production-ready with proper error handling, health checks, and graceful shutdown.

For questions or issues, refer to the [Troubleshooting](#troubleshooting) section or check service logs.
