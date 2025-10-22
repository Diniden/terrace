# RAG Embedding Metadata Implementation

## Overview

This document describes the database schema changes implemented to support RAG (Retrieval-Augmented Generation) embedding metadata tracking for Facts in the Terrace knowledge management system.

## Implementation Date

October 2025

## Problem Statement

The system needs to track embedding status and metadata for Facts to support:
1. Identifying which Facts need embedding
2. Detecting when Facts need re-embedding (after statement changes)
3. Supporting future embedding model migrations
4. Debugging embedding failures
5. Maintaining ChromaDB synchronization

## Design Decisions

### 1. Metadata Storage Approach

**Decision:** Store embedding metadata in PostgreSQL, vector data in ChromaDB

**Rationale:**
- PostgreSQL serves as the source of truth for fact content and metadata
- ChromaDB specializes in vector storage and similarity search
- Separation of concerns: relational data vs. vector data
- UUID as sole linking mechanism keeps architecture simple

**What we DO store in PostgreSQL:**
- `embedding_status`: Track lifecycle state (pending/embedded/failed)
- `last_embedded_at`: Timestamp of successful embedding
- `embedding_version`: Model version for migration tracking (e.g., "v1.0.0")
- `embedding_model`: Provider/model identifier (e.g., "openai/text-embedding-3-small")

**What we DON'T store in PostgreSQL:**
- Vector embeddings themselves (ChromaDB responsibility)
- Embedding dimensions or vector data
- Similarity scores or search results

### 2. Trigger/Hook Strategy

**Decision:** Use TypeORM lifecycle hooks (@AfterInsert, @AfterUpdate) instead of database triggers

**Rationale:**
- Database triggers should focus on data integrity (which they already do)
- Application-level hooks provide better separation of concerns
- Non-blocking: hooks just update status field, don't perform embedding
- Easier to test and maintain than PL/pgSQL
- Can leverage TypeScript type safety

**Implementation:**
- `@AfterInsert`: Set status to 'pending' for new facts with statements
- `@AfterUpdate`: Set status to 'pending' if statement changed
- Background embedding service polls for 'pending' facts
- Service updates status to 'embedded' or 'failed' after processing

### 3. Embedding Status State Machine

```
┌─────────┐
│ PENDING │◄──────────────────────┐
└────┬────┘                       │
     │                             │
     │ Embedding Service           │ Statement
     │ Processes                   │ Changed
     │                             │
     ▼                             │
┌──────────┐                  ┌──────────┐
│ EMBEDDED │                  │  FAILED  │
└──────────┘                  └─────┬────┘
     │                              │
     └──────────────────────────────┘
        Retry or Statement Change
```

**States:**
- **PENDING**: Fact needs embedding or re-embedding
- **EMBEDDED**: Successfully embedded in ChromaDB
- **FAILED**: Embedding attempt failed (temporary or permanent)

**Transitions:**
- New fact with statement → PENDING
- Statement changed → PENDING (re-embed required)
- Embedding succeeds → EMBEDDED
- Embedding fails → FAILED
- Retry failed embedding → PENDING

## Schema Changes

### New Columns in `facts` Table

| Column | Type | Nullable | Default | Purpose |
|--------|------|----------|---------|---------|
| `embedding_status` | enum | NO | 'pending' | Track embedding lifecycle state |
| `last_embedded_at` | timestamp | YES | NULL | When fact was last successfully embedded |
| `embedding_version` | varchar(100) | YES | NULL | Embedding model version identifier |
| `embedding_model` | varchar(100) | YES | NULL | Provider/model identifier |

### New Enum Type

```sql
CREATE TYPE facts_embedding_status_enum AS ENUM (
  'pending',
  'embedded',
  'failed'
);
```

### New Index

```sql
CREATE INDEX "IDX_facts_embedding_status" ON facts(embedding_status);
```

**Purpose:** Enable efficient querying of facts that need embedding:
```sql
-- Embedding service query
SELECT * FROM facts
WHERE embedding_status = 'pending'
AND statement IS NOT NULL
ORDER BY updated_at DESC
LIMIT 100;
```

## TypeORM Entity Updates

### New Enum

```typescript
export enum EmbeddingStatus {
  PENDING = 'pending',
  EMBEDDED = 'embedded',
  FAILED = 'failed',
}
```

### New Properties

```typescript
@Column({
  type: 'enum',
  enum: EmbeddingStatus,
  default: EmbeddingStatus.PENDING,
})
embeddingStatus: EmbeddingStatus;

@Column({ name: 'last_embedded_at', nullable: true })
lastEmbeddedAt: Date;

@Column({ name: 'embedding_version', nullable: true })
embeddingVersion: string;

@Column({ name: 'embedding_model', nullable: true })
embeddingModel: string;
```

### Lifecycle Hooks

```typescript
@AfterInsert()
markForEmbeddingAfterInsert() {
  // New facts with statements should be embedded
  if (this.statement && this.statement.trim() !== '') {
    this.embeddingStatus = EmbeddingStatus.PENDING;
  }
}

@AfterUpdate()
markForEmbeddingAfterUpdate() {
  // If statement changed, mark for re-embedding
  if (
    this.previousStatement !== undefined &&
    this.previousStatement !== this.statement &&
    this.statement &&
    this.statement.trim() !== ''
  ) {
    this.embeddingStatus = EmbeddingStatus.PENDING;
    this.lastEmbeddedAt = null;
  }
}
```

## Migration

**File:** `backend/src/migrations/1729519600000-AddEmbeddingMetadataToFacts.ts`

**Migration Strategy:**
1. Create enum type
2. Add columns with defaults
3. Create index
4. Update existing facts to 'pending' if they have statements

**Rollback Strategy:**
1. Drop index
2. Drop columns
3. Drop enum type

**Testing Migration:**
```bash
# Run migration
npm run migration:run

# Verify schema
psql -d terrace_db -c "\d facts"

# Rollback if needed
npm run migration:revert
```

## Usage Examples

### 1. Creating a New Fact (Automatic Embedding)

```typescript
const fact = new Fact();
fact.statement = 'The sky is blue on clear days';
fact.corpusId = corpus.id;
fact.context = FactContext.CORPUS_KNOWLEDGE;

await factRepository.save(fact);
// After save, fact.embeddingStatus will be PENDING
// Background embedding service will process it
```

### 2. Updating a Fact Statement (Re-embedding)

```typescript
const fact = await factRepository.findOne({ where: { id: factId } });
fact.statement = 'The sky appears blue due to Rayleigh scattering';

await factRepository.save(fact);
// After save, fact.embeddingStatus will be PENDING
// fact.lastEmbeddedAt will be null
// Background service will re-embed
```

### 3. Embedding Service Processing

```typescript
// Query for pending facts
const pendingFacts = await factRepository.find({
  where: {
    embeddingStatus: EmbeddingStatus.PENDING,
    statement: Not(IsNull()),
  },
  order: { updatedAt: 'DESC' },
  take: 100,
});

for (const fact of pendingFacts) {
  try {
    // Generate embedding via Python service
    const embedding = await embeddingService.generateEmbedding(fact.statement);

    // Store in ChromaDB
    await chromaService.upsert(fact.id, embedding, {
      statement: fact.statement,
      corpusId: fact.corpusId,
      context: fact.context,
    });

    // Update fact metadata
    fact.embeddingStatus = EmbeddingStatus.EMBEDDED;
    fact.lastEmbeddedAt = new Date();
    fact.embeddingVersion = 'v1.0.0';
    fact.embeddingModel = 'openai/text-embedding-3-small';
    await factRepository.save(fact);
  } catch (error) {
    // Mark as failed
    fact.embeddingStatus = EmbeddingStatus.FAILED;
    await factRepository.save(fact);
    logger.error(`Failed to embed fact ${fact.id}:`, error);
  }
}
```

### 4. Querying Embedding Status

```typescript
// Get facts needing embedding
const pendingCount = await factRepository.count({
  where: { embeddingStatus: EmbeddingStatus.PENDING },
});

// Get failed embeddings for retry
const failedFacts = await factRepository.find({
  where: { embeddingStatus: EmbeddingStatus.FAILED },
  order: { updatedAt: 'DESC' },
});

// Get successfully embedded facts
const embeddedFacts = await factRepository.find({
  where: {
    embeddingStatus: EmbeddingStatus.EMBEDDED,
    lastEmbeddedAt: MoreThan(new Date('2025-01-01')),
  },
});
```

### 5. Detecting Stale Embeddings

```typescript
// Find facts that changed after last embedding
const staleFacts = await factRepository
  .createQueryBuilder('fact')
  .where('fact.embedding_status = :status', { status: EmbeddingStatus.EMBEDDED })
  .andWhere('fact.updated_at > fact.last_embedded_at')
  .getMany();

// Re-mark for embedding
for (const fact of staleFacts) {
  fact.embeddingStatus = EmbeddingStatus.PENDING;
  fact.lastEmbeddedAt = null;
  await factRepository.save(fact);
}
```

## Testing

**Test File:** `backend/src/entities/fact.entity.spec.ts`

**Test Coverage:**
- Default embedding status
- Setting all embedding metadata fields
- Null/undefined handling
- AfterInsert hook behavior
- AfterUpdate hook behavior
- Statement change detection
- Integration with existing Fact properties
- Enum value validation
- State transitions

**Running Tests:**
```bash
cd backend
npm test -- fact.entity.spec.ts
```

## Performance Considerations

### Index Usage

The `IDX_facts_embedding_status` index enables efficient queries:

```sql
-- Efficient: Uses index
EXPLAIN ANALYZE
SELECT * FROM facts
WHERE embedding_status = 'pending'
LIMIT 100;

-- Also efficient: Composite query
EXPLAIN ANALYZE
SELECT * FROM facts
WHERE embedding_status = 'pending'
AND corpus_id = 'some-uuid';
```

### Batch Processing

Embedding service should process facts in batches:
- Limit: 100-500 facts per batch
- Order by: `updated_at DESC` for recent changes first
- Consider corpus-based batching for locality

### Avoiding N+1 Queries

When loading facts with embedding status:

```typescript
// Good: Single query
const facts = await factRepository.find({
  where: { corpusId },
  select: ['id', 'statement', 'embeddingStatus', 'lastEmbeddedAt'],
});

// Avoid: Loading full relations unless needed
const facts = await factRepository.find({
  where: { corpusId },
  relations: ['corpus', 'basis', 'supports', 'supportedBy'], // Only if needed
});
```

## Future Enhancements

### 1. Embedding Model Migration

When upgrading embedding models:

```typescript
// Mark all facts for re-embedding
await factRepository.update(
  { embeddingVersion: 'v1.0.0' },
  {
    embeddingStatus: EmbeddingStatus.PENDING,
    lastEmbeddedAt: null,
  }
);

// Process with new model
// Update embeddingVersion to 'v2.0.0' after re-embedding
```

### 2. Selective Re-embedding

Re-embed only specific contexts:

```typescript
await factRepository.update(
  { context: FactContext.CORPUS_KNOWLEDGE },
  { embeddingStatus: EmbeddingStatus.PENDING }
);
```

### 3. Monitoring Dashboard

Track embedding health:
- Count of pending facts
- Count of failed facts
- Average embedding latency
- Embedding success rate
- Stale embedding detection

### 4. Retry Strategy

Implement exponential backoff for failed embeddings:

```typescript
interface EmbeddingRetryMetadata {
  attempts: number;
  lastAttempt: Date;
  nextRetry: Date;
}

// Store in fact.meta.embeddingRetry
```

## Constraints and Validations

### Database-Level
- `embedding_status` NOT NULL with default
- Enum constraint enforces valid status values
- Index ensures query performance

### Application-Level
- Lifecycle hooks automatically manage status
- Empty/null statements don't trigger embedding
- Statement changes trigger re-embedding

### Integration with Existing Triggers
- No conflicts with existing fact triggers:
  - `set_fact_state_on_empty_statement`
  - `validate_fact_basis`
  - `validate_fact_support`
  - `decouple_fact_relationships_on_corpus_change`
  - `validate_fact_context`

## Debugging

### Common Issues

**Facts stuck in PENDING:**
```sql
-- Check for old pending facts
SELECT id, statement, updated_at, created_at
FROM facts
WHERE embedding_status = 'pending'
AND updated_at < NOW() - INTERVAL '1 hour'
ORDER BY updated_at DESC;
```

**Failed embeddings:**
```sql
-- Review failed facts
SELECT id, statement, updated_at
FROM facts
WHERE embedding_status = 'failed'
ORDER BY updated_at DESC;
```

**Stale embeddings:**
```sql
-- Find facts updated after embedding
SELECT id, statement, updated_at, last_embedded_at
FROM facts
WHERE embedding_status = 'embedded'
AND updated_at > last_embedded_at;
```

## Related Documentation

- [Database Agent Prompt](/backend/.cursorrules)
- [Fact Entity Domain Model](./FACTS_DOMAIN_MODEL.md)
- [RAG System Architecture](./RAG_ARCHITECTURE.md) (to be created)
- [Embedding Service Integration](./EMBEDDING_SERVICE.md) (to be created)

## Changelog

### v1.0.0 (October 2025)
- Initial implementation
- Added embedding metadata columns
- Implemented lifecycle hooks
- Created migration and tests
- Documented usage and best practices
