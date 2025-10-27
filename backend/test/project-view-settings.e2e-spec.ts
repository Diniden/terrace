import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('ProjectViewSettings E2E Tests', () => {
  let app: INestApplication;
  let authToken: string;
  let projectId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    // Login to get auth token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'admin@example.com',
        password: 'admin123',
      })
      .expect(200);

    authToken = loginResponse.body.accessToken;

    // Create a test project
    const projectResponse = await request(app.getHttpServer())
      .post('/projects')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Test Project for Settings',
        description: 'E2E test project',
      })
      .expect(201);

    projectId = projectResponse.body.id;
  });

  afterAll(async () => {
    // Cleanup: Delete the test project
    await request(app.getHttpServer())
      .delete(`/projects/${projectId}`)
      .set('Authorization', `Bearer ${authToken}`);

    await app.close();
  });

  describe('POST /project-view-settings (create)', () => {
    it('should create new settings', async () => {
      const response = await request(app.getHttpServer())
        .post('/project-view-settings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          projectId,
          settings: {
            scrollPositions: { corpus1: 100 },
            corpusColumnWidths: { corpus1: 300 },
          },
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.projectId).toBe(projectId);
      expect(response.body.settings).toEqual({
        scrollPositions: { corpus1: 100 },
        corpusColumnWidths: { corpus1: 300 },
      });
    });

    it('should reject creation if settings already exist', async () => {
      await request(app.getHttpServer())
        .post('/project-view-settings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          projectId,
          settings: { scrollPositions: {} },
        })
        .expect(400);
    });

    it('should reject creation with invalid JSON', async () => {
      await request(app.getHttpServer())
        .post('/project-view-settings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          projectId,
          settings: 'not-an-object',
        })
        .expect(400);
    });

    it('should reject creation for non-existent project', async () => {
      await request(app.getHttpServer())
        .post('/project-view-settings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          projectId: '00000000-0000-0000-0000-000000000000',
          settings: {},
        })
        .expect(404);
    });
  });

  describe('GET /project-view-settings', () => {
    it('should retrieve existing settings', async () => {
      const response = await request(app.getHttpServer())
        .get('/project-view-settings')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ projectId })
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body.projectId).toBe(projectId);
      expect(response.body.settings).toHaveProperty('scrollPositions');
    });

    it('should return null for non-existent settings', async () => {
      // Create a new project without settings
      const newProjectResponse = await request(app.getHttpServer())
        .post('/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Project Without Settings',
        })
        .expect(201);

      const newProjectId = newProjectResponse.body.id;

      const response = await request(app.getHttpServer())
        .get('/project-view-settings')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ projectId: newProjectId })
        .expect(200);

      expect(response.body).toBeNull();

      // Cleanup
      await request(app.getHttpServer())
        .delete(`/projects/${newProjectId}`)
        .set('Authorization', `Bearer ${authToken}`);
    });

    it('should reject request for non-existent project', async () => {
      await request(app.getHttpServer())
        .get('/project-view-settings')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ projectId: '00000000-0000-0000-0000-000000000000' })
        .expect(404);
    });
  });

  describe('PUT /project-view-settings (update)', () => {
    it('should update existing settings', async () => {
      const response = await request(app.getHttpServer())
        .put('/project-view-settings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          projectId,
          settings: {
            scrollPositions: { corpus1: 200 },
            factStackExpansionStates: { fact1: true },
          },
        })
        .expect(200);

      expect(response.body.projectId).toBe(projectId);
      expect(response.body.settings).toEqual({
        scrollPositions: { corpus1: 200 },
        factStackExpansionStates: { fact1: true },
      });
    });

    it('should reject update for non-existent settings', async () => {
      // Create a new project without settings
      const newProjectResponse = await request(app.getHttpServer())
        .post('/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Project for Update Test',
        })
        .expect(201);

      const newProjectId = newProjectResponse.body.id;

      await request(app.getHttpServer())
        .put('/project-view-settings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          projectId: newProjectId,
          settings: {},
        })
        .expect(404);

      // Cleanup
      await request(app.getHttpServer())
        .delete(`/projects/${newProjectId}`)
        .set('Authorization', `Bearer ${authToken}`);
    });
  });

  describe('POST /project-view-settings/upsert', () => {
    it('should create settings if they do not exist', async () => {
      // Create a new project
      const newProjectResponse = await request(app.getHttpServer())
        .post('/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Project for Upsert Test',
        })
        .expect(201);

      const newProjectId = newProjectResponse.body.id;

      const response = await request(app.getHttpServer())
        .post('/project-view-settings/upsert')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          projectId: newProjectId,
          settings: { scrollPositions: { corpus1: 50 } },
        })
        .expect(200);

      expect(response.body.projectId).toBe(newProjectId);
      expect(response.body.settings).toEqual({
        scrollPositions: { corpus1: 50 },
      });

      // Cleanup
      await request(app.getHttpServer())
        .delete(`/projects/${newProjectId}`)
        .set('Authorization', `Bearer ${authToken}`);
    });

    it('should update settings if they already exist', async () => {
      const response = await request(app.getHttpServer())
        .post('/project-view-settings/upsert')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          projectId,
          settings: { scrollPositions: { corpus1: 999 } },
        })
        .expect(200);

      expect(response.body.projectId).toBe(projectId);
      expect(response.body.settings).toEqual({
        scrollPositions: { corpus1: 999 },
      });
    });
  });

  describe('DELETE /project-view-settings', () => {
    it('should delete existing settings', async () => {
      await request(app.getHttpServer())
        .delete('/project-view-settings')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ projectId })
        .expect(204);

      // Verify settings are deleted
      const response = await request(app.getHttpServer())
        .get('/project-view-settings')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ projectId })
        .expect(200);

      expect(response.body).toBeNull();
    });

    it('should gracefully handle deletion of non-existent settings', async () => {
      await request(app.getHttpServer())
        .delete('/project-view-settings')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ projectId })
        .expect(204);
    });
  });

  describe('Authentication Guard', () => {
    it('should block unauthenticated GET requests', async () => {
      await request(app.getHttpServer())
        .get('/project-view-settings')
        .query({ projectId })
        .expect(401);
    });

    it('should block unauthenticated POST requests', async () => {
      await request(app.getHttpServer())
        .post('/project-view-settings')
        .send({ projectId, settings: {} })
        .expect(401);
    });

    it('should block unauthenticated PUT requests', async () => {
      await request(app.getHttpServer())
        .put('/project-view-settings')
        .send({ projectId, settings: {} })
        .expect(401);
    });

    it('should block unauthenticated DELETE requests', async () => {
      await request(app.getHttpServer())
        .delete('/project-view-settings')
        .query({ projectId })
        .expect(401);
    });
  });
});
