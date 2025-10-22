# RAG API Documentation

REST API endpoints for natural language fact queries and embedding management.

## Table of Contents

- [Authentication](#authentication)
- [Natural Language Search Endpoints](#natural-language-search-endpoints)
  - [POST /facts/search](#post-factssearch)
  - [GET /facts/:id/similar](#get-factsidsimilar)
- [Admin Endpoints - Embedding Management](#admin-endpoints---embedding-management)
  - [POST /facts/:id/embeddings/regenerate](#post-factsidembeddingsregenerate)
  - [GET /facts/embeddings/status](#get-factsembeddingsstatus)
  - [POST /facts/embeddings/process](#post-factsembeddingsprocess)
  - [GET /facts/embeddings/health](#get-factsembeddingshealth)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)

---

## Authentication

All endpoints require JWT authentication via Bearer token.

```bash
# Include in all requests
-H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Natural Language Search Endpoints

### POST /facts/search

Search facts using natural language queries. Returns facts ranked by semantic similarity.

**URL:** `/facts/search`

**Method:** `POST`

**Auth required:** Yes

**Request Body:**

```json
{
  "query": "string (required) - Natural language search query",
  "limit": "number (optional) - Max results (1-100, default: 10)",
  "contextIds": "string[] (optional) - Filter by corpus IDs"
}
```

**Success Response:**

- **Code:** 200 OK
- **Content:**

```json
[
  {
    "fact": {
      "id": "uuid",
      "statement": "string",
      "corpusId": "uuid",
      "context": "corpus_global | corpus_builder | corpus_knowledge",
      "state": "clarify | conflict | ready | rejected | confirmed",
      "embeddingStatus": "pending | embedded | failed",
      "createdAt": "timestamp",
      "updatedAt": "timestamp"
    },
    "score": 87.5,
    "matchedStatement": "string"
  }
]
```

**Error Responses:**

- **Code:** 400 Bad Request - Invalid query or parameters
- **Code:** 401 Unauthorized - Missing or invalid JWT token
- **Code:** 503 Service Unavailable - RAG service disabled or unavailable

**Example Request:**

```bash
curl -X POST http://localhost:3000/facts/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "query": "quantum mechanics entanglement",
    "limit": 10
  }'
```

**Example Response:**

```json
[
  {
    "fact": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "statement": "Quantum entanglement is a physical phenomenon where particles remain correlated regardless of distance",
      "corpusId": "550e8400-e29b-41d4-a716-446655440001",
      "context": "corpus_knowledge",
      "state": "ready",
      "embeddingStatus": "embedded",
      "createdAt": "2024-10-22T10:00:00.000Z",
      "updatedAt": "2024-10-22T10:00:00.000Z"
    },
    "score": 92.3,
    "matchedStatement": "Quantum entanglement is a physical phenomenon where particles remain correlated regardless of distance"
  },
  {
    "fact": {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "statement": "Quantum mechanics describes the behavior of matter at atomic scales",
      "corpusId": "550e8400-e29b-41d4-a716-446655440001",
      "context": "corpus_knowledge",
      "state": "ready",
      "embeddingStatus": "embedded",
      "createdAt": "2024-10-22T09:00:00.000Z",
      "updatedAt": "2024-10-22T09:00:00.000Z"
    },
    "score": 85.7,
    "matchedStatement": "Quantum mechanics describes the behavior of matter at atomic scales"
  }
]
```

**With Context Filtering:**

```bash
curl -X POST http://localhost:3000/facts/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "query": "machine learning",
    "limit": 5,
    "contextIds": ["550e8400-e29b-41d4-a716-446655440001"]
  }'
```

---

### GET /facts/:id/similar

Find facts semantically similar to a given fact.

**URL:** `/facts/:id/similar`

**Method:** `GET`

**Auth required:** Yes

**URL Parameters:**

- `id` (required) - UUID of the source fact

**Query Parameters:**

- `limit` (optional, default: 5) - Maximum number of similar facts to return
- `sameCorpusOnly` (optional, default: true) - Only search within the same corpus

**Success Response:**

- **Code:** 200 OK
- **Content:** Array of FactSearchResult (same structure as search endpoint)

**Error Responses:**

- **Code:** 400 Bad Request - Invalid UUID format
- **Code:** 401 Unauthorized - Missing or invalid JWT token
- **Code:** 404 Not Found - Fact not found
- **Code:** 503 Service Unavailable - RAG service disabled or unavailable

**Example Request:**

```bash
curl -X GET "http://localhost:3000/facts/550e8400-e29b-41d4-a716-446655440000/similar?limit=5&sameCorpusOnly=true" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Example Response:**

```json
[
  {
    "fact": {
      "id": "550e8400-e29b-41d4-a716-446655440003",
      "statement": "Superposition allows quantum systems to exist in multiple states simultaneously",
      "corpusId": "550e8400-e29b-41d4-a716-446655440001",
      "context": "corpus_knowledge",
      "state": "ready",
      "embeddingStatus": "embedded",
      "createdAt": "2024-10-22T11:00:00.000Z",
      "updatedAt": "2024-10-22T11:00:00.000Z"
    },
    "score": 78.9,
    "matchedStatement": "Superposition allows quantum systems to exist in multiple states simultaneously"
  }
]
```

**Search Across All Corpuses:**

```bash
curl -X GET "http://localhost:3000/facts/550e8400-e29b-41d4-a716-446655440000/similar?limit=10&sameCorpusOnly=false" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Admin Endpoints - Embedding Management

These endpoints are intended for administrative use and should be protected with appropriate role-based access control.

### POST /facts/:id/embeddings/regenerate

Manually trigger re-embedding of a specific fact. Useful for recovery after embedding failures or when updating embedding models.

**URL:** `/facts/:id/embeddings/regenerate`

**Method:** `POST`

**Auth required:** Yes (Admin)

**URL Parameters:**

- `id` (required) - UUID of the fact to re-embed

**Success Response:**

- **Code:** 200 OK
- **Content:**

```json
{
  "message": "Embedding regeneration triggered successfully",
  "factId": "uuid"
}
```

**Error Responses:**

- **Code:** 400 Bad Request - Fact has no statement
- **Code:** 401 Unauthorized - Missing or invalid JWT token
- **Code:** 404 Not Found - Fact not found
- **Code:** 503 Service Unavailable - RAG service disabled or unavailable

**Example Request:**

```bash
curl -X POST http://localhost:3000/facts/550e8400-e29b-41d4-a716-446655440000/embeddings/regenerate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Example Response:**

```json
{
  "message": "Embedding regeneration triggered successfully",
  "factId": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

### GET /facts/embeddings/status

Get statistics about fact embeddings in the system.

**URL:** `/facts/embeddings/status`

**Method:** `GET`

**Auth required:** Yes (Admin)

**Success Response:**

- **Code:** 200 OK
- **Content:**

```json
{
  "total": 1000,
  "embedded": 950,
  "pending": 40,
  "failed": 10,
  "completionRate": 95.0
}
```

**Example Request:**

```bash
curl -X GET http://localhost:3000/facts/embeddings/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Example Response:**

```json
{
  "total": 1523,
  "embedded": 1487,
  "pending": 28,
  "failed": 8,
  "completionRate": 97.64
}
```

---

### POST /facts/embeddings/process

Process facts with pending embedding status. Triggers batch processing of embeddings.

**URL:** `/facts/embeddings/process`

**Method:** `POST`

**Auth required:** Yes (Admin)

**Query Parameters:**

- `limit` (optional, default: 100) - Maximum number of facts to process in this batch

**Success Response:**

- **Code:** 200 OK
- **Content:**

```json
{
  "message": "Processing N pending embeddings",
  "processed": 42
}
```

**Error Responses:**

- **Code:** 401 Unauthorized - Missing or invalid JWT token
- **Code:** 503 Service Unavailable - RAG service disabled or unavailable

**Example Request:**

```bash
curl -X POST "http://localhost:3000/facts/embeddings/process?limit=50" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Example Response:**

```json
{
  "message": "Processing 42 pending embeddings",
  "processed": 42
}
```

**Process with Default Limit:**

```bash
curl -X POST http://localhost:3000/facts/embeddings/process \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### GET /facts/embeddings/health

Check health status of the RAG service and its dependencies.

**URL:** `/facts/embeddings/health`

**Method:** `GET`

**Auth required:** Yes (Admin)

**Success Response:**

- **Code:** 200 OK
- **Content:**

```json
{
  "status": "healthy | degraded | unhealthy | disabled | error",
  "provider": "openai",
  "chromadb": "connected | disconnected | unknown",
  "embeddingDimension": 1536,
  "enabled": true
}
```

**Example Request:**

```bash
curl -X GET http://localhost:3000/facts/embeddings/health \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Example Response (Healthy):**

```json
{
  "status": "healthy",
  "provider": "openai",
  "chromadb": "connected",
  "embeddingDimension": 1536,
  "enabled": true
}
```

**Example Response (Disabled):**

```json
{
  "status": "disabled",
  "provider": "unknown",
  "chromadb": "unknown",
  "enabled": false
}
```

**Example Response (Unhealthy):**

```json
{
  "status": "unhealthy",
  "provider": "unknown",
  "chromadb": "disconnected",
  "enabled": true
}
```

---

## Error Handling

All endpoints follow a consistent error response format:

```json
{
  "statusCode": 400,
  "message": "Detailed error message",
  "error": "Bad Request"
}
```

### Common HTTP Status Codes

- **200 OK** - Request succeeded
- **201 Created** - Resource created successfully
- **400 Bad Request** - Invalid request parameters or body
- **401 Unauthorized** - Missing or invalid authentication token
- **403 Forbidden** - Insufficient permissions
- **404 Not Found** - Resource not found
- **500 Internal Server Error** - Unexpected server error
- **503 Service Unavailable** - RAG service disabled or unavailable

### RAG-Specific Error Scenarios

#### RAG Service Disabled

When the RAG service is disabled via configuration (`RAG_SERVICE_ENABLED=false`):

```json
{
  "statusCode": 503,
  "message": "RAG service is disabled. Natural language search is not available.",
  "error": "Service Unavailable"
}
```

#### RAG Service Connection Failed

When the Python RAG service cannot be reached:

```json
{
  "statusCode": 503,
  "message": "Failed to search facts: Cannot connect to RAG service at http://localhost:8001",
  "error": "Service Unavailable"
}
```

#### Empty Search Query

```json
{
  "statusCode": 400,
  "message": "Search query cannot be empty",
  "error": "Bad Request"
}
```

#### Invalid Limit Parameter

```json
{
  "statusCode": 400,
  "message": "limit must not be greater than 100",
  "error": "Bad Request"
}
```

---

## Rate Limiting

**Note:** Rate limiting is not currently implemented but should be added for production use, especially for expensive operations like:

- Natural language search
- Embedding generation
- Batch processing

**Recommended limits:**

- Search endpoints: 60 requests/minute per user
- Admin endpoints: 30 requests/minute per user
- Embedding regeneration: 10 requests/minute per user

---

## Complete Usage Examples

### 1. Search for Facts and Find Similar Ones

```bash
# Step 1: Search for facts about quantum mechanics
SEARCH_RESULT=$(curl -s -X POST http://localhost:3000/facts/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "query": "quantum entanglement",
    "limit": 1
  }')

echo "Search Result: $SEARCH_RESULT"

# Step 2: Extract the fact ID from the first result
FACT_ID=$(echo $SEARCH_RESULT | jq -r '.[0].fact.id')

echo "Fact ID: $FACT_ID"

# Step 3: Find similar facts to the first result
curl -X GET "http://localhost:3000/facts/$FACT_ID/similar?limit=5&sameCorpusOnly=true" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" | jq
```

### 2. Monitor and Process Embeddings

```bash
# Step 1: Check current embedding status
curl -X GET http://localhost:3000/facts/embeddings/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" | jq

# Step 2: Check RAG service health
curl -X GET http://localhost:3000/facts/embeddings/health \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" | jq

# Step 3: Process pending embeddings
curl -X POST "http://localhost:3000/facts/embeddings/process?limit=50" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" | jq

# Step 4: Verify status again
curl -X GET http://localhost:3000/facts/embeddings/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" | jq
```

### 3. Re-embed a Specific Fact

```bash
FACT_ID="550e8400-e29b-41d4-a716-446655440000"

# Trigger re-embedding
curl -X POST "http://localhost:3000/facts/$FACT_ID/embeddings/regenerate" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" | jq
```

### 4. Search with Corpus Filtering

```bash
# Get facts from a specific corpus only
CORPUS_ID="550e8400-e29b-41d4-a716-446655440001"

curl -X POST http://localhost:3000/facts/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d "{
    \"query\": \"neural networks deep learning\",
    \"limit\": 10,
    \"contextIds\": [\"$CORPUS_ID\"]
  }" | jq
```

---

## Testing with Swagger UI

The API includes full Swagger/OpenAPI documentation. Access it at:

```
http://localhost:3000/api/docs
```

Features:
- Interactive API testing
- Request/response examples
- Schema validation
- Authentication testing

---

## Performance Considerations

### Search Performance

- **Cold start:** First search may take 2-5 seconds (embedding generation)
- **Warm searches:** Typically 100-500ms
- **Large result sets:** Use pagination/limits to avoid overwhelming responses

### Embedding Processing

- **Single fact:** ~200-500ms per fact
- **Batch processing:** More efficient for multiple facts
- **Failed embeddings:** Automatically retried via background job

### Best Practices

1. **Use appropriate limits** - Don't request more results than needed
2. **Cache search results** - Implement client-side caching for repeated queries
3. **Batch operations** - Use batch endpoints for processing multiple facts
4. **Monitor health** - Regularly check `/embeddings/health` for service status
5. **Handle 503 gracefully** - Implement exponential backoff for RAG service failures

---

## Security Considerations

1. **Authentication:** All endpoints require valid JWT tokens
2. **Authorization:** Admin endpoints should be protected with role-based access control
3. **Input validation:** All inputs are validated using class-validator
4. **Rate limiting:** Should be implemented for production use
5. **Sensitive data:** Embeddings and internal RAG service details are never exposed

---

## Configuration

### Environment Variables

```bash
# RAG Service Configuration
RAG_SERVICE_HOST=http://localhost
RAG_SERVICE_PORT=8001
RAG_SERVICE_ENABLED=true

# Embedding Configuration
OPENAI_API_KEY=your_api_key_here
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSION=1536
```

### Disabling RAG Service

To disable RAG features:

```bash
RAG_SERVICE_ENABLED=false
```

When disabled, all RAG endpoints will return 503 Service Unavailable.

---

## Support and Issues

For issues or questions:
1. Check the logs for detailed error messages
2. Verify RAG service health using `/facts/embeddings/health`
3. Ensure proper authentication tokens are provided
4. Review the E2E tests for usage examples

---

## Changelog

### Version 1.0.0 (2024-10-22)

- Initial release
- Natural language search endpoints
- Similar facts discovery
- Embedding management endpoints
- Full Swagger documentation
- E2E test suite
