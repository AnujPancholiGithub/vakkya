import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createApp } from '../app.js';
import { validateEnv } from '../config/env.js';
import { createLogger } from '../config/logger.js';
import { prisma } from '../lib/prisma.js';
import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

describe('Widget Token Validation API', () => {
  let app: Awaited<ReturnType<typeof createApp>>;
  let userId: string | undefined;
  let projectId: string | undefined;
  let widgetToken: string | undefined;
  const testEmail = `test-widget-${Date.now()}@example.com`;

  beforeEach(async () => {
    const env = validateEnv();
    const logger = createLogger(env);
    app = await createApp(env, logger);

    // Create test user
    const hashedPassword = await bcrypt.hash('testpassword123', 10);
    const user = await prisma.user.create({
      data: {
        email: testEmail,
        password: hashedPassword,
      },
    });
    userId = user.id;

    // Create test project
    const project = await prisma.project.create({
      data: {
        userId: user.id,
        name: 'Test Widget Project',
        widgetToken: randomBytes(32).toString('hex'),
      },
    });
    projectId = project.id;
    widgetToken = project.widgetToken;
  });

  afterEach(async () => {
    // Clean up test data - use try/catch to ensure all cleanup runs
    try {
      if (projectId) {
        await prisma.project.delete({ where: { id: projectId } }).catch(() => {});
      }
    } finally {
      try {
        if (userId) {
          await prisma.user.delete({ where: { id: userId } }).catch(() => {});
        }
      } finally {
        if (app) {
          await app.close();
        }
      }
    }
  });

  describe('POST /validate-token', () => {
    it('should return project config for valid token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/validate-token',
        payload: {
          widgetToken,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.projectId).toBe(projectId);
      expect(data.projectName).toBe('Test Widget Project');
      expect(data.livekitUrl).toBeDefined();
      expect(data.livekitToken).toBeDefined();
      expect(data.roomName).toBeDefined();
      expect(data.roomName).toMatch(/^vakkya-/);
      // Session config with defaults (Requirements 6.2, 6.3)
      expect(data.sessionConfig).toBeDefined();
      expect(data.sessionConfig.initiationMode).toBe('agent_first');
      expect(data.sessionConfig.autoTerminate).toBe(true);
    });

    it('should return 401 for invalid token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/validate-token',
        payload: {
          widgetToken: randomBytes(32).toString('hex'), // Valid format but wrong token
        },
      });

      expect(response.statusCode).toBe(401);
      const data = JSON.parse(response.body);
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe('INVALID_TOKEN');
      expect(data.error.message).toBe('Invalid widget token');
    });

    it('should return 400 for malformed token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/validate-token',
        payload: {
          widgetToken: 'invalid-token', // Wrong format
        },
      });

      expect(response.statusCode).toBe(400);
      const data = JSON.parse(response.body);
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for missing token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/validate-token',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      const data = JSON.parse(response.body);
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should include request ID in error responses', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/validate-token',
        payload: {
          widgetToken: randomBytes(32).toString('hex'),
        },
      });

      expect(response.statusCode).toBe(401);
      const data = JSON.parse(response.body);
      expect(data.error.requestId).toBeDefined();
      expect(typeof data.error.requestId).toBe('string');
    });
  });
});
