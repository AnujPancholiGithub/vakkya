import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createApp } from '../app.js';
import { validateEnv } from '../config/env.js';
import { createLogger } from '../config/logger.js';
import { prisma } from '../lib/prisma.js';
import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

describe('Conversation API Routes', () => {
  let app: Awaited<ReturnType<typeof createApp>>;
  let authToken: string;
  let userId: string | undefined;
  let projectId: string | undefined;
  let widgetToken: string | undefined;
  const testEmail = `test-conversations-${Date.now()}@example.com`;

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

    // Create test project
    const project = await prisma.project.create({
      data: {
        userId: user.id,
        name: 'Test Project',
        widgetToken: randomBytes(32).toString('hex'),
      },
    });
    projectId = project.id;
    widgetToken = project.widgetToken;
  });

  afterEach(async () => {
    // Clean up test data in correct order
    if (projectId) {
      // Delete conversation turns first
      await prisma.conversationTurn.deleteMany({
        where: {
          conversation: {
            projectId,
          },
        },
      });

      // Then delete conversations
      await prisma.conversation.deleteMany({
        where: { projectId },
      });

      // Then delete project
      await prisma.project.delete({
        where: { id: projectId },
      });
    }
    if (userId) {
      await prisma.user.delete({
        where: { id: userId },
      });
    }
    if (app) {
      await app.close();
    }
  });

  describe('POST /conversations', () => {
    it('should create a conversation with valid token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/conversations',
        payload: {
          projectId,
          sessionId: 'session-123',
          widgetToken,
        },
      });

      expect(response.statusCode).toBe(201);
      const data = JSON.parse(response.body);
      expect(data.conversation).toBeDefined();
      expect(data.conversation.projectId).toBe(projectId);
      expect(data.conversation.sessionId).toBe('session-123');
      expect(data.conversation.turnCount).toBe(0);
    });

    it('should reject invalid widget token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/conversations',
        payload: {
          projectId,
          sessionId: 'session-123',
          widgetToken: randomBytes(32).toString('hex'), // Valid format but wrong token
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('POST /conversations/:id/turns', () => {
    it('should add a turn to conversation', async () => {
      // First create a conversation
      const createResponse = await app.inject({
        method: 'POST',
        url: '/conversations',
        payload: {
          projectId,
          sessionId: 'session-456',
          widgetToken,
        },
      });

      const { conversation } = JSON.parse(createResponse.body);

      // Add a turn
      const response = await app.inject({
        method: 'POST',
        url: `/conversations/${conversation.id}/turns`,
        payload: {
          userQuery: 'What is your return policy?',
          agentResponse: 'Our return policy allows returns within 30 days.',
          widgetToken,
        },
      });

      expect(response.statusCode).toBe(201);
      const data = JSON.parse(response.body);
      expect(data.turn).toBeDefined();
      expect(data.turn.userQuery).toBe('What is your return policy?');
      expect(data.turn.agentResponse).toBe(
        'Our return policy allows returns within 30 days.'
      );
    });

    it('should reject invalid widget token', async () => {
      // First create a conversation with valid token
      const createResponse = await app.inject({
        method: 'POST',
        url: '/conversations',
        payload: {
          projectId,
          sessionId: 'session-invalid-token',
          widgetToken,
        },
      });

      const { conversation } = JSON.parse(createResponse.body);

      // Try to add turn with invalid token
      const response = await app.inject({
        method: 'POST',
        url: `/conversations/${conversation.id}/turns`,
        payload: {
          userQuery: 'Test',
          agentResponse: 'Test',
          widgetToken: randomBytes(32).toString('hex'), // Valid format but wrong token
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /projects/:projectId/conversations', () => {
    it('should list conversations for a project', async () => {
      // Create a conversation
      await app.inject({
        method: 'POST',
        url: '/conversations',
        payload: {
          projectId,
          sessionId: 'session-789',
          widgetToken,
        },
      });

      // List conversations
      const response = await app.inject({
        method: 'GET',
        url: `/projects/${projectId}/conversations`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.conversations).toBeDefined();
      expect(data.conversations.length).toBeGreaterThan(0);
    });

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/projects/${projectId}/conversations`,
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /conversations/:id', () => {
    it('should get conversation detail with turns', async () => {
      // Create conversation
      const createResponse = await app.inject({
        method: 'POST',
        url: '/conversations',
        payload: {
          projectId,
          sessionId: 'session-detail',
          widgetToken,
        },
      });

      const { conversation } = JSON.parse(createResponse.body);

      // Add a turn
      await app.inject({
        method: 'POST',
        url: `/conversations/${conversation.id}/turns`,
        payload: {
          userQuery: 'Question 1',
          agentResponse: 'Answer 1',
          widgetToken,
        },
      });

      // Get conversation detail
      const response = await app.inject({
        method: 'GET',
        url: `/conversations/${conversation.id}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.conversation).toBeDefined();
      expect(data.conversation.turns).toBeDefined();
      expect(data.conversation.turns.length).toBe(1);
      expect(data.conversation.turns[0].userQuery).toBe('Question 1');
    });

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/conversations/fake-id',
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
