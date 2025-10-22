# RAG for Facts Feature Plan

## Summary

This feature introduces semantic search capabilities for Facts using Retrieval Augmented Generation (RAG). Facts will be embedded into a vector database (ChromaDB) where their statements are converted to embeddings for natural language retrieval. A Python service using LitServe will handle embedding generation and queries, supporting multiple model providers (Claude, OpenAI, Ollama, or local models). The backend will communicate with this service to automatically embed facts when created/updated and retrieve semantically similar facts via natural language queries. ChromaDB will run as a Docker service and be integrated into the mprocs development workflow.

---

## Agent Updates

**Agent:** agent-orchestrator.md

### 1. Update all agents with RAG and embedding concepts

- MUST include understanding that Facts now have a vector representation in ChromaDB
- MUST include that fact statements are the source of embeddings, not entire fact objects
- MUST include that the database ID is the key linking facts to their embeddings
- MUST include understanding of the Python RAG service as a separate microservice
- SHOULD NOT include implementation details of how embeddings are generated
- SHOULD NOT assume direct database access to ChromaDB from backend code

### 2. Update agents with multi-provider embedding model strategy

- MUST include that embedding generation is configurable across multiple providers
- MUST include the provider options: Claude, OpenAI, Ollama, local models
- SHOULD NOT specify which provider is default or preferred
- SHOULD NOT include authentication or API key specifics

---

## Database

**Agent:** database-agent.md

### 1. Evaluate need for embedding metadata storage

- MUST determine if fact embedding status needs tracking (embedded/not embedded, last updated)
- MUST determine if embedding version or model information should be stored
- SHOULD NOT duplicate ChromaDB data in PostgreSQL
- SHOULD NOT create complex relational structures for vector data

### 2. Consider triggers or hooks for fact changes

- MUST evaluate if database triggers should notify when facts are created/updated
- MUST ensure fact statement changes can trigger re-embedding
- SHOULD NOT implement synchronous embedding in database triggers
- SHOULD NOT block fact operations waiting for embedding completion

### 3. Include testing for database changes

- MUST test any new columns, triggers, or hooks added for embedding tracking
- MUST verify fact CRUD operations still work correctly with embedding metadata
- SHOULD NOT test vector similarity or embedding quality (that's Python service responsibility)

---

## Backend Business

**Agent:** business-logic-agent.md

### 1. Create utility service for Python RAG communication

- MUST create a configurable HTTP client for the Python RAG service
- MUST support configuration of the RAG service host/port
- MUST handle connection failures gracefully
- MUST provide methods for: embedding facts, querying by natural language, health checks
- SHOULD NOT implement retry logic beyond basic connection handling initially
- SHOULD NOT cache embeddings in the backend

### 2. Integrate fact embedding into fact lifecycle

- MUST automatically trigger embedding when facts are created
- MUST automatically trigger re-embedding when fact statements are updated
- MUST handle embedding failures without blocking fact operations
- SHOULD NOT make embedding synchronous if it impacts performance
- SHOULD NOT prevent fact deletion if embedding exists

### 3. Implement natural language fact retrieval service

- MUST provide service methods to query facts by natural language
- MUST return fact entities, not just IDs or embeddings
- MUST handle cases where embeddings don't exist yet
- SHOULD NOT implement complex ranking or filtering yet
- SHOULD NOT expose raw vector similarity scores to business logic

### 4. Include testing for business logic

- MUST test fact embedding triggers on create/update
- MUST test natural language retrieval returns correct facts
- MUST test graceful degradation when Python service is unavailable
- MUST mock the Python RAG service in unit tests
- SHOULD include integration tests with actual Python service running

---

## Backend API

**Agent:** rest-api-agent.md

### 1. Create endpoints for natural language fact queries

- MUST create GET endpoint for querying facts by natural language
- MUST validate query parameters (search text, limit, filters)
- MUST return standard fact response DTOs
- SHOULD NOT expose embedding vectors in API responses initially
- SHOULD NOT create custom response formats different from existing fact endpoints

### 2. Create admin/utility endpoints for embedding management

- MUST create endpoint to manually trigger fact re-embedding
- MUST create endpoint to check embedding status for facts
- MUST create endpoint to check Python RAG service health
- SHOULD NOT expose these endpoints to regular users without proper guards
- SHOULD NOT allow bulk operations that could overload the system

### 3. Handle errors from Python service gracefully

- MUST return appropriate HTTP status codes when RAG service fails
- MUST provide clear error messages for embedding failures
- SHOULD NOT expose internal Python service errors to API consumers
- SHOULD NOT retry failed requests at the API layer

### 4. Include API testing

- MUST create E2E tests for natural language fact queries with Playwright
- MUST test error handling when Python service is down
- MUST validate request/response schemas for new endpoints
- SHOULD include tests for different query types and edge cases

---

## Devops

**Agent:** devops-agent.md

### 1. Add ChromaDB to Docker configuration

- MUST create ChromaDB service in docker-compose
- MUST configure persistent volume for ChromaDB data
- MUST expose appropriate ports for ChromaDB access
- MUST ensure ChromaDB starts before dependent services
- SHOULD NOT use in-memory mode for ChromaDB
- SHOULD NOT expose ChromaDB ports publicly in production config

### 2. Add Python RAG service to mprocs

- MUST add the Python LitServe RAG service to mprocs.yaml
- MUST point to Python executable in venv to avoid activation steps
- MUST configure proper working directory for Python service
- MUST ensure service starts after ChromaDB is ready
- SHOULD NOT hardcode absolute paths that won't work across machines
- SHOULD NOT make the mprocs config depend on specific Python versions

### 3. Update database seeding script

- MUST update seed script to optionally trigger fact embeddings
- MUST make embedding during seeding optional/configurable
- SHOULD NOT block seeding if Python service isn't running
- SHOULD NOT require seeding to wait for all embeddings to complete

### 4. Create utility scripts for RAG operations

- MUST create script to re-embed all existing facts
- MUST create script to check embedding coverage/status
- MUST create script to reset/clear ChromaDB if needed
- SHOULD NOT create scripts that could accidentally delete production data
- SHOULD NOT implement complex CLI interfaces initially

### 5. Include devops testing

- MUST verify ChromaDB starts correctly with docker-compose
- MUST verify Python service starts in mprocs without errors
- MUST test database seeding script with and without embedding enabled
- SHOULD test utility scripts in development environment

---

## Python RAG Service

**Agent:** litserve-rag-architect.md

### 1. Create LitServe service for embedding and retrieval

- MUST create new LitServe API in ./python directory
- MUST implement endpoint for embedding fact statements
- MUST implement endpoint for natural language query/retrieval
- MUST implement health check endpoint
- MUST use ChromaDB as the vector database
- SHOULD NOT implement authentication in initial version
- SHOULD NOT create multiple LitServe files; one service handles all RAG operations

### 2. Implement configurable embedding model provider

- MUST support configuration for model provider selection
- MUST implement provider for Claude API
- MUST implement provider for OpenAI API
- MUST implement provider for Ollama (remote host)
- MUST implement provider for local embedding models
- MUST make provider selection via configuration file or environment variables
- SHOULD NOT hardcode API keys or credentials
- SHOULD NOT default to paid APIs without explicit configuration

### 3. ChromaDB integration and fact storage

- MUST store fact database ID as metadata with each embedding
- MUST use fact statement as the document/text for embedding
- MUST support filtering by fact IDs in queries
- MUST support returning top-k similar facts
- SHOULD NOT store entire fact objects in ChromaDB
- SHOULD NOT create separate collections for different fact types initially

### 4. Error handling and logging

- MUST handle model provider failures gracefully
- MUST log embedding operations for debugging
- MUST return clear error messages for invalid requests
- SHOULD NOT crash on individual fact embedding failures
- SHOULD NOT expose sensitive information in error messages

### 5. Include Python service testing

- MUST create tests for each embedding provider
- MUST test ChromaDB connection and basic operations
- MUST test embedding and retrieval workflows end-to-end
- MUST test error handling for unavailable providers
- SHOULD include mock providers for testing without API keys
- SHOULD test with sample fact statements from the domain model

---

## Testing Strategy

### Integration Testing

- MUST test full workflow: create fact → embed → query → retrieve
- MUST test with Python service running in Docker/mprocs environment
- MUST test backend can communicate with Python service
- MUST verify ChromaDB persists embeddings across restarts

### Performance Testing

- SHOULD test embedding latency for single facts
- SHOULD test query performance with various dataset sizes
- SHOULD test concurrent embedding requests

### Failure Mode Testing

- MUST test behavior when Python service is unavailable
- MUST test behavior when ChromaDB is unavailable
- MUST test behavior when embedding provider fails
- MUST test recovery after service restarts

---

## Notes

- Frontend integration is explicitly excluded from this plan
- All agents MUST be used only in their specified sections
- Testing is required for each section that introduces changes
- No implementation specifics are provided; agents determine implementation details
