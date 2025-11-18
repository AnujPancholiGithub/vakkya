import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ConversationService } from './conversation.service.js';
import { prisma } from '../lib/prisma.js';
import { hashSync } from 'bcrypt';
import { randomBytes } from 'crypto';

describe('ConversationService', () => {
  const conversationService = new ConversationService();
  const testUserEmail = 'test-user-' + Date.now() + '@example.com';
  let testUserId: string;
  let testProjectId: string;

  // Create test user and project before each test
  beforeEach(async () => {
    const testUser = await prisma.user.create({
      data: {
        email: testUserEmail,
        password: hashSync('password123', 10),
      },
    });
    testUserId = testUser.id;

    const testProject = await prisma.project.create({
      data: {
        userId: testUserId,
        name: 'Test Project',
        widgetToken: randomBytes(32).toString('hex'),
      },
    });
    testProjectId = testProject.id;
  });

  // Clean up test data after each test
  afterEach(async () => {
    await prisma.conversation.deleteMany({
      where: { projectId: testProjectId },
    });

    await prisma.project.deleteMany({
      where: { userId: testUserId },
    });

    await prisma.user.deleteMany({
      where: { email: testUserEmail },
    });
  });

  describe('Conversation Creation', () => {
    it('should create a new conversation', async () => {
      const sessionId = 'session-' + Date.now();

      const conversation = await conversationService.create({
        projectId: testProjectId,
        sessionId,
      });

      expect(conversation.id).toBeDefined();
      expect(conversation.projectId).toBe(testProjectId);
      expect(conversation.sessionId).toBe(sessionId);
      expect(conversation.turnCount).toBe(0);
      expect(conversation.startedAt).toBeInstanceOf(Date);
    });

    it('should create multiple conversations for same project', async () => {
      const conversation1 = await conversationService.create({
        projectId: testProjectId,
        sessionId: 'session-1',
      });

      const conversation2 = await conversationService.create({
        projectId: testProjectId,
        sessionId: 'session-2',
      });

      expect(conversation1.id).not.toBe(conversation2.id);
      expect(conversation1.projectId).toBe(testProjectId);
      expect(conversation2.projectId).toBe(testProjectId);
    });
  });

  describe('Turn Appending', () => {
    it('should add a turn to conversation and increment turnCount', async () => {
      const conversation = await conversationService.create({
        projectId: testProjectId,
        sessionId: 'session-test',
      });

      const turn = await conversationService.addTurn(conversation.id, {
        userQuery: 'What is your return policy?',
        agentResponse: 'Our return policy allows returns within 30 days.',
      });

      expect(turn).toBeDefined();
      expect(turn.userQuery).toBe('What is your return policy?');

      const updated = await conversationService.get(
        conversation.id,
        testProjectId
      );

      expect(updated.turnCount).toBe(1);
      expect(updated.turns).toHaveLength(1);
      expect(updated.turns[0].userQuery).toBe('What is your return policy?');
      expect(updated.turns[0].agentResponse).toBe(
        'Our return policy allows returns within 30 days.'
      );
    });

    it('should correctly increment turnCount for multiple turns', async () => {
      const conversation = await conversationService.create({
        projectId: testProjectId,
        sessionId: 'session-multi',
      });

      await conversationService.addTurn(conversation.id, {
        userQuery: 'Question 1',
        agentResponse: 'Answer 1',
      });

      await conversationService.addTurn(conversation.id, {
        userQuery: 'Question 2',
        agentResponse: 'Answer 2',
      });

      await conversationService.addTurn(conversation.id, {
        userQuery: 'Question 3',
        agentResponse: 'Answer 3',
      });

      const updated = await conversationService.get(
        conversation.id,
        testProjectId
      );

      expect(updated.turnCount).toBe(3);
      expect(updated.turns).toHaveLength(3);
    });

    it('should throw error when adding turn to non-existent conversation', async () => {
      await expect(
        conversationService.addTurn('non-existent-id', {
          userQuery: 'Test query',
          agentResponse: 'Test response',
        })
      ).rejects.toThrow('Conversation not found');
    });

    it('should maintain turn order by timestamp', async () => {
      const conversation = await conversationService.create({
        projectId: testProjectId,
        sessionId: 'session-order',
      });

      await conversationService.addTurn(conversation.id, {
        userQuery: 'First question',
        agentResponse: 'First answer',
      });

      // Small delay to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10));

      await conversationService.addTurn(conversation.id, {
        userQuery: 'Second question',
        agentResponse: 'Second answer',
      });

      const updated = await conversationService.get(
        conversation.id,
        testProjectId
      );

      expect(updated.turns[0].userQuery).toBe('First question');
      expect(updated.turns[1].userQuery).toBe('Second question');
      expect(updated.turns[0].timestamp.getTime()).toBeLessThan(
        updated.turns[1].timestamp.getTime()
      );
    });
  });

  describe('List and Get Operations', () => {
    it('should list all conversations for a project', async () => {
      await conversationService.create({
        projectId: testProjectId,
        sessionId: 'session-1',
      });

      await conversationService.create({
        projectId: testProjectId,
        sessionId: 'session-2',
      });

      await conversationService.create({
        projectId: testProjectId,
        sessionId: 'session-3',
      });

      const conversations = await conversationService.list(testProjectId);

      expect(conversations).toHaveLength(3);
      expect(conversations.every((c) => c.projectId === testProjectId)).toBe(
        true
      );
    });

    it('should return conversations in descending order by startedAt', async () => {
      const conv1 = await conversationService.create({
        projectId: testProjectId,
        sessionId: 'session-1',
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      const conv2 = await conversationService.create({
        projectId: testProjectId,
        sessionId: 'session-2',
      });

      const conversations = await conversationService.list(testProjectId);

      // Most recent first
      expect(conversations[0].id).toBe(conv2.id);
      expect(conversations[1].id).toBe(conv1.id);
    });

    it('should get conversation with all turns', async () => {
      const conversation = await conversationService.create({
        projectId: testProjectId,
        sessionId: 'session-detail',
      });

      await conversationService.addTurn(conversation.id, {
        userQuery: 'Query 1',
        agentResponse: 'Response 1',
      });

      await conversationService.addTurn(conversation.id, {
        userQuery: 'Query 2',
        agentResponse: 'Response 2',
      });

      const detail = await conversationService.get(
        conversation.id,
        testProjectId
      );

      expect(detail.id).toBe(conversation.id);
      expect(detail.turns).toHaveLength(2);
      expect(detail.turns[0].userQuery).toBe('Query 1');
      expect(detail.turns[1].userQuery).toBe('Query 2');
    });

    it('should throw error for non-existent conversation', async () => {
      await expect(
        conversationService.get('non-existent-id', testProjectId)
      ).rejects.toThrow('Conversation not found or access denied');
    });

    it('should throw error when accessing conversation from different project', async () => {
      const conversation = await conversationService.create({
        projectId: testProjectId,
        sessionId: 'session-security-test',
      });

      // Try to access with wrong projectId
      await expect(
        conversationService.get(conversation.id, 'wrong-project-id')
      ).rejects.toThrow('Conversation not found or access denied');
    });
  });
});
