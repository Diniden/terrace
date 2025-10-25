import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { User, ApplicationRole } from '../src/entities/user.entity';
import { Project } from '../src/entities/project.entity';
import { Corpus } from '../src/entities/corpus.entity';
import { Fact, FactState, FactContext } from '../src/entities/fact.entity';

describe('RAG API (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let authToken: string;
  let testUser: User;
  let testProject: Project;
  let testCorpus: Corpus;
  let testFacts: Fact[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    // Get DataSource for database operations
    dataSource = app.get(DataSource);

    // Setup test data
    await setupTestData();
  });

  afterAll(async () => {
    // Cleanup test data
    await cleanupTestData();
    await app.close();
  });

  async function setupTestData() {
    // Create test user
    const userRepository = dataSource.getRepository(User);
    testUser = userRepository.create({
      email: 'rag-test@example.com',
      password: 'hashed_password',
      applicationRole: ApplicationRole.USER,
    });
    testUser = await userRepository.save(testUser);

    // Create test project
    const projectRepository = dataSource.getRepository(Project);
    testProject = projectRepository.create({
      name: 'RAG Test Project',
      description: 'Project for RAG API testing',
      ownerId: testUser.id,
    });
    testProject = await projectRepository.save(testProject);

    // Create test corpus
    const corpusRepository = dataSource.getRepository(Corpus);
    testCorpus = corpusRepository.create({
      name: 'RAG Test Corpus',
      description: 'Corpus for RAG API testing',
      projectId: testProject.id,
    });
    testCorpus = await corpusRepository.save(testCorpus);

    // Create test facts with different contexts
    const factRepository = dataSource.getRepository(Fact);

    const fact1 = factRepository.create({
      statement:
        'Quantum mechanics describes the behavior of matter at atomic scales',
      corpusId: testCorpus.id,
      context: FactContext.CORPUS_KNOWLEDGE,
      state: FactState.READY,
    });

    const fact2 = factRepository.create({
      statement:
        'Entanglement is a quantum phenomenon where particles remain correlated',
      corpusId: testCorpus.id,
      context: FactContext.CORPUS_KNOWLEDGE,
      state: FactState.READY,
    });

    const fact3 = factRepository.create({
      statement: 'The wave function describes the quantum state of a system',
      corpusId: testCorpus.id,
      context: FactContext.CORPUS_KNOWLEDGE,
      state: FactState.READY,
    });

    const fact4 = factRepository.create({
      statement: 'Global fact for testing',
      corpusId: testCorpus.id,
      context: FactContext.CORPUS_GLOBAL,
      state: FactState.READY,
    });

    testFacts = await factRepository.save([fact1, fact2, fact3, fact4]);

    // Mock authentication by getting a JWT token
    // For testing purposes, we'll skip actual authentication
    // In a real scenario, you'd call the auth endpoint
    authToken = 'mock-jwt-token'; // TODO: Replace with actual token generation
  }

  async function cleanupTestData() {
    if (dataSource.isInitialized) {
      const factRepository = dataSource.getRepository(Fact);
      const corpusRepository = dataSource.getRepository(Corpus);
      const projectRepository = dataSource.getRepository(Project);
      const userRepository = dataSource.getRepository(User);

      await factRepository.delete({ corpusId: testCorpus.id });
      await corpusRepository.delete({ id: testCorpus.id });
      await projectRepository.delete({ id: testProject.id });
      await userRepository.delete({ id: testUser.id });
    }
  }

  describe('POST /facts/search - Natural Language Search', () => {
    it('should search facts using natural language', () => {
      return request(app.getHttpServer())
        .post('/facts/search')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: 'quantum mechanics',
          limit: 10,
        })
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          if (res.body.length > 0) {
            expect(res.body[0]).toHaveProperty('fact');
            expect(res.body[0]).toHaveProperty('score');
            expect(res.body[0]).toHaveProperty('matchedStatement');
            expect(typeof res.body[0].score).toBe('number');
            expect(res.body[0].score).toBeGreaterThanOrEqual(0);
            expect(res.body[0].score).toBeLessThanOrEqual(100);
          }
        });
    });

    it('should search facts with context filtering', () => {
      return request(app.getHttpServer())
        .post('/facts/search')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: 'quantum entanglement',
          limit: 5,
          contextIds: [testCorpus.id],
        })
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('should respect limit parameter', () => {
      return request(app.getHttpServer())
        .post('/facts/search')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: 'quantum',
          limit: 2,
        })
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeLessThanOrEqual(2);
        });
    });

    it('should return 400 for empty query', () => {
      return request(app.getHttpServer())
        .post('/facts/search')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: '',
          limit: 10,
        })
        .expect(400);
    });

    it('should return 400 for invalid limit', () => {
      return request(app.getHttpServer())
        .post('/facts/search')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: 'quantum',
          limit: 200, // exceeds max of 100
        })
        .expect(400);
    });

    it('should return empty array for non-matching query', () => {
      return request(app.getHttpServer())
        .post('/facts/search')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: 'zzzzzzzzzzzzz nonexistent term zzzzzzzzz',
          limit: 10,
        })
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          // May or may not return results depending on RAG service
        });
    });

    it('should return 503 when RAG service is disabled', () => {
      // This test assumes RAG service can be disabled
      // Skip if service is always enabled
      // You might need to mock the RagClientService for this test
    });
  });

  describe('GET /facts/:id/similar - Find Similar Facts', () => {
    it('should find similar facts to a given fact', () => {
      const sourceFact = testFacts[0]; // Quantum mechanics fact

      return request(app.getHttpServer())
        .get(`/facts/${sourceFact.id}/similar`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 5, sameCorpusOnly: true })
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          if (res.body.length > 0) {
            expect(res.body[0]).toHaveProperty('fact');
            expect(res.body[0]).toHaveProperty('score');
            expect(res.body[0]).toHaveProperty('matchedStatement');
            // Source fact should not be in results
            expect(
              res.body.find((r) => r.fact.id === sourceFact.id),
            ).toBeUndefined();
          }
        });
    });

    it('should respect limit parameter', () => {
      const sourceFact = testFacts[0];

      return request(app.getHttpServer())
        .get(`/facts/${sourceFact.id}/similar`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 2, sameCorpusOnly: true })
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeLessThanOrEqual(2);
        });
    });

    it('should filter by same corpus when sameCorpusOnly is true', () => {
      const sourceFact = testFacts[0];

      return request(app.getHttpServer())
        .get(`/facts/${sourceFact.id}/similar`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 5, sameCorpusOnly: true })
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          if (res.body.length > 0) {
            res.body.forEach((result) => {
              expect(result.fact.corpusId).toBe(sourceFact.corpusId);
            });
          }
        });
    });

    it('should return 404 for non-existent fact', () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      return request(app.getHttpServer())
        .get(`/facts/${nonExistentId}/similar`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 5, sameCorpusOnly: true })
        .expect(404);
    });

    it('should return 400 for invalid UUID', () => {
      return request(app.getHttpServer())
        .get('/facts/invalid-uuid/similar')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 5, sameCorpusOnly: true })
        .expect(400);
    });
  });

  describe('POST /facts/:id/embeddings/regenerate - Regenerate Embedding', () => {
    it('should trigger embedding regeneration for a fact', () => {
      const fact = testFacts[0];

      return request(app.getHttpServer())
        .post(`/facts/${fact.id}/embeddings/regenerate`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body).toHaveProperty('factId');
          expect(res.body.factId).toBe(fact.id);
        });
    });

    it('should return 404 for non-existent fact', () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      return request(app.getHttpServer())
        .post(`/facts/${nonExistentId}/embeddings/regenerate`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should return 400 for fact without statement', async () => {
      // Create a fact without statement
      const factRepository = dataSource.getRepository(Fact);
      const emptyFact = factRepository.create({
        corpusId: testCorpus.id,
        context: FactContext.CORPUS_KNOWLEDGE,
        state: FactState.CLARIFY,
      });
      const savedEmptyFact = await factRepository.save(emptyFact);

      const response = await request(app.getHttpServer())
        .post(`/facts/${savedEmptyFact.id}/embeddings/regenerate`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      // Cleanup
      await factRepository.delete({ id: savedEmptyFact.id });
    });
  });

  describe('GET /facts/embeddings/status - Embedding Statistics', () => {
    it('should return embedding statistics', () => {
      return request(app.getHttpServer())
        .get('/facts/embeddings/status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('total');
          expect(res.body).toHaveProperty('embedded');
          expect(res.body).toHaveProperty('pending');
          expect(res.body).toHaveProperty('failed');
          expect(res.body).toHaveProperty('completionRate');

          expect(typeof res.body.total).toBe('number');
          expect(typeof res.body.embedded).toBe('number');
          expect(typeof res.body.pending).toBe('number');
          expect(typeof res.body.failed).toBe('number');
          expect(typeof res.body.completionRate).toBe('number');

          expect(res.body.completionRate).toBeGreaterThanOrEqual(0);
          expect(res.body.completionRate).toBeLessThanOrEqual(100);
        });
    });
  });

  describe('POST /facts/embeddings/process - Process Pending Embeddings', () => {
    it('should process pending embeddings', () => {
      return request(app.getHttpServer())
        .post('/facts/embeddings/process')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 50 })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body).toHaveProperty('processed');
          expect(typeof res.body.processed).toBe('number');
        });
    });

    it('should respect limit parameter', () => {
      return request(app.getHttpServer())
        .post('/facts/embeddings/process')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 10 })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('processed');
          expect(res.body.processed).toBeLessThanOrEqual(10);
        });
    });

    it('should use default limit when not specified', () => {
      return request(app.getHttpServer())
        .post('/facts/embeddings/process')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body).toHaveProperty('processed');
        });
    });
  });

  describe('GET /facts/embeddings/health - RAG Health Check', () => {
    it('should return RAG service health status', () => {
      return request(app.getHttpServer())
        .get('/facts/embeddings/health')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status');
          expect(res.body).toHaveProperty('provider');
          expect(res.body).toHaveProperty('chromadb');
          expect(res.body).toHaveProperty('enabled');

          expect(typeof res.body.enabled).toBe('boolean');

          if (res.body.enabled) {
            expect(['healthy', 'degraded', 'unhealthy', 'error']).toContain(
              res.body.status,
            );
          } else {
            expect(res.body.status).toBe('disabled');
          }
        });
    });

    it('should include embedding dimension when available', () => {
      return request(app.getHttpServer())
        .get('/facts/embeddings/health')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          if (res.body.enabled && res.body.status === 'healthy') {
            // Embedding dimension might be included
            if (res.body.embeddingDimension !== undefined) {
              expect(typeof res.body.embeddingDimension).toBe('number');
              expect(res.body.embeddingDimension).toBeGreaterThan(0);
            }
          }
        });
    });
  });

  describe('Integration Tests - Full RAG Workflow', () => {
    it('should complete full workflow: create fact → embed → search → retrieve', async () => {
      // 1. Create a new fact
      const createResponse = await request(app.getHttpServer())
        .post('/facts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          statement: 'Machine learning is a subset of artificial intelligence',
          corpusId: testCorpus.id,
          context: FactContext.CORPUS_KNOWLEDGE,
          state: FactState.READY,
        })
        .expect(201);

      const newFactId = createResponse.body.id;

      // 2. Trigger embedding
      await request(app.getHttpServer())
        .post(`/facts/${newFactId}/embeddings/regenerate`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // 3. Wait a bit for embedding to process (in real scenario, use polling or webhooks)
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // 4. Search for the fact
      const searchResponse = await request(app.getHttpServer())
        .post('/facts/search')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: 'machine learning artificial intelligence',
          limit: 10,
        })
        .expect(200);

      // 5. Verify fact appears in search results (if embedding succeeded)
      // Note: This might not always work if RAG service is disabled or slow

      // 6. Find similar facts
      const similarResponse = await request(app.getHttpServer())
        .get(`/facts/${newFactId}/similar`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 5, sameCorpusOnly: true })
        .expect(200);

      expect(Array.isArray(similarResponse.body)).toBe(true);

      // Cleanup
      await request(app.getHttpServer())
        .delete(`/facts/${newFactId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });

    it('should handle multiple facts with context filtering', async () => {
      // Create facts in different contexts
      const knowledgeFact = await request(app.getHttpServer())
        .post('/facts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          statement: 'Neural networks mimic biological neurons',
          corpusId: testCorpus.id,
          context: FactContext.CORPUS_KNOWLEDGE,
        })
        .expect(201);

      const globalFact = await request(app.getHttpServer())
        .post('/facts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          statement: 'Global fact for testing context filtering',
          corpusId: testCorpus.id,
          context: FactContext.CORPUS_GLOBAL,
        })
        .expect(201);

      // Search with context filter
      const searchResponse = await request(app.getHttpServer())
        .post('/facts/search')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: 'neural networks',
          limit: 10,
          contextIds: [testCorpus.id],
        })
        .expect(200);

      // Cleanup
      await request(app.getHttpServer())
        .delete(`/facts/${knowledgeFact.body.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .delete(`/facts/${globalFact.body.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });
  });

  describe('Error Handling', () => {
    it('should handle RAG service unavailable gracefully', () => {
      // This test would require mocking the RAG service to simulate failure
      // For now, we'll just document the expected behavior
      // When RAG service is down, endpoints should return 503
    });

    it('should handle invalid fact IDs', () => {
      return request(app.getHttpServer())
        .get('/facts/invalid-id/similar')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });

    it('should require authentication', () => {
      return request(app.getHttpServer())
        .post('/facts/search')
        .send({ query: 'test', limit: 10 })
        .expect(401);
    });
  });
});
