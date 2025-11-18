import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createApp } from '../app.js';
import { validateEnv } from '../config/env.js';
import { createLogger } from '../config/logger.js';
import { prisma } from '../lib/prisma.js';
import bcrypt from 'bcrypt';

describe('Project API Routes', () => {
  let app: Awaited<ReturnType<typeof createApp>>;
  let authToken: string;
  let userId: string;
  const testEmail = `test-projects-${Date.now()}@example.com`;

  beforeEach(async () => {
    const env = validateEnv();
    const logger = createLogger(env);
    app = await createApp(env, logger);

    // Create test user and get auth token
    const hashedPassword = await bcrypt.hash('testpassword123', 10);
    const user = await prisma.user.create({
      data: {
        email: testEmail,
        password: hashedPassword,
      },
    });
    userId = user.id;

    // Login to get token
    const loginResponse = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: testEmail,
        password: 'testpassword123',
      },
    });

    const loginData = JSON.parse(loginResponse.body);
    authToken = loginData.token;
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.project.deleteMany({
      where: { userId },
    });
    await prisma.user.delete({
      where: { id: userId },
    });
    await app.close();
  });

  describe('POST /projects', () => {
    it('should create a project with valid data', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/projects',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          name: 'Test Project',
        },
      });

      expect(response.statusCode).toBe(201);
      const data = JSON.parse(response.body);
      expect(data.project).toBeDefined();
      expect(data.project.name).toBe('Test Project');
      expect(data.project.widgetToken).toBeDefined();
      expect(data.project.widgetToken).toHaveLength(64);
    });

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/projects',
        payload: {
          name: 'Test Project',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should validate project name', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/projects',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          name: '',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /projects', () => {
    it('should list user projects', async () => {
      // Create a test project
      await prisma.project.create({
        data: {
          userId,
          name: 'Test Project 1',
          widgetToken: 'test-token-1',
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: '/projects',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.projects).toBeDefined();
      expect(data.projects.length).toBeGreaterThan(0);
    });

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/projects',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /projects/:id', () => {
    it('should get project details for owner', async () => {
      const project = await prisma.project.create({
        data: {
          userId,
          name: 'Test Project',
          widgetToken: 'test-token',
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: `/projects/${project.id}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.project.id).toBe(project.id);
      expect(data.project.name).toBe('Test Project');
    });

    it('should return 404 for non-existent project', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/projects/00000000-0000-0000-0000-000000000000',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('PATCH /projects/:id', () => {
    it('should update project for owner', async () => {
      const project = await prisma.project.create({
        data: {
          userId,
          name: 'Original Name',
          widgetToken: 'test-token',
        },
      });

      const response = await app.inject({
        method: 'PATCH',
        url: `/projects/${project.id}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          name: 'Updated Name',
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.project.name).toBe('Updated Name');
    });
  });

  describe('DELETE /projects/:id', () => {
    it('should delete project for owner', async () => {
      const project = await prisma.project.create({
        data: {
          userId,
          name: 'Test Project',
          widgetToken: 'test-token',
        },
      });

      const response = await app.inject({
        method: 'DELETE',
        url: `/projects/${project.id}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(204);

      // Verify project is deleted
      const deletedProject = await prisma.project.findUnique({
        where: { id: project.id },
      });
      expect(deletedProject).toBeNull();
    });
  });
});
