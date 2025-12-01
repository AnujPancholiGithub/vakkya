import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FormEventService } from './form-event.service.js';
import { prisma } from '../lib/prisma.js';
import { hashSync } from 'bcrypt';
import { randomBytes } from 'crypto';

/**
 * Property 22: Event Logging Completeness
 * Validates: Requirements 11.1, 11.2, 11.3, 11.4
 *
 * For any form lifecycle event (activation, field collection, submission, abandonment),
 * the system SHALL log the event with all required metadata.
 */
describe('FormEventService (Property 22: Event Logging Completeness)', () => {
  const formEventService = new FormEventService();
  const testUserEmail = `event-test-${randomBytes(8).toString('hex')}@example.com`;
  let testUserId: string;
  let testProjectId: string;
  let testFormId: string;
  let testConversationId: string;
  const testSessionId = `session-${randomBytes(8).toString('hex')}`;

  beforeEach(async () => {
    // Create test user
    const testUser = await prisma.user.create({
      data: {
        email: testUserEmail,
        password: hashSync('password123', 10),
      },
    });
    testUserId = testUser.id;

    // Create test project
    const testProject = await prisma.project.create({
      data: {
        userId: testUserId,
        name: 'Event Test Project',
        widgetToken: randomBytes(32).toString('hex'),
      },
    });
    testProjectId = testProject.id;

    // Create test form
    const testForm = await prisma.formSchema.create({
      data: {
        projectId: testProjectId,
        name: 'Test Form',
        fields: [{ name: 'email', type: 'email', label: 'Email', required: true }],
      },
    });
    testFormId = testForm.id;


    // Create test conversation
    const testConversation = await prisma.conversation.create({
      data: {
        projectId: testProjectId,
        sessionId: testSessionId,
      },
    });
    testConversationId = testConversation.id;
  });

  afterEach(async () => {
    // Clean up in order
    await prisma.formEvent.deleteMany({ where: { formSchemaId: testFormId } });
    await prisma.formSubmission.deleteMany({ where: { formSchemaId: testFormId } });
    await prisma.conversation.deleteMany({ where: { projectId: testProjectId } });
    await prisma.formSchema.deleteMany({ where: { projectId: testProjectId } });
    await prisma.project.deleteMany({ where: { id: testProjectId } });
    await prisma.user.deleteMany({ where: { email: testUserEmail } });
  });

  describe('logFormActivation (Requirement 11.1)', () => {
    it('should log activation event with form ID and session ID', async () => {
      const event = await formEventService.logFormActivation({
        formSchemaId: testFormId,
        sessionId: testSessionId,
      });

      expect(event.id).toBeDefined();
      expect(event.formSchemaId).toBe(testFormId);
      expect(event.sessionId).toBe(testSessionId);
      expect(event.eventType).toBe('activated');
      expect(event.timestamp).toBeInstanceOf(Date);
    });

    it('should log activation with trigger reason in metadata', async () => {
      const event = await formEventService.logFormActivation({
        formSchemaId: testFormId,
        sessionId: testSessionId,
        triggerReason: 'User said "I want to contact you"',
      });

      expect(event.eventType).toBe('activated');
      expect(event.metadata).toEqual({ triggerReason: 'User said "I want to contact you"' });
    });

    it('should log activation with conversation ID when provided', async () => {
      const event = await formEventService.logFormActivation({
        formSchemaId: testFormId,
        sessionId: testSessionId,
        conversationId: testConversationId,
      });

      expect(event.conversationId).toBe(testConversationId);
    });
  });


  describe('logFieldCollected (Requirement 11.2)', () => {
    it('should log field collection with name, value, and attempt count', async () => {
      const event = await formEventService.logFieldCollected({
        formSchemaId: testFormId,
        sessionId: testSessionId,
        fieldName: 'email',
        fieldValue: 'test@example.com',
        attemptCount: 1,
      });

      expect(event.eventType).toBe('field_collected');
      expect(event.fieldName).toBe('email');
      expect(event.fieldValue).toBe('test@example.com');
      expect(event.attemptCount).toBe(1);
    });

    it('should track multiple attempts for same field', async () => {
      const event = await formEventService.logFieldCollected({
        formSchemaId: testFormId,
        sessionId: testSessionId,
        fieldName: 'phone',
        fieldValue: '+1234567890',
        attemptCount: 3,
      });

      expect(event.attemptCount).toBe(3);
    });

    it('should log field collection with conversation ID', async () => {
      const event = await formEventService.logFieldCollected({
        formSchemaId: testFormId,
        sessionId: testSessionId,
        conversationId: testConversationId,
        fieldName: 'name',
        fieldValue: 'John Doe',
        attemptCount: 1,
      });

      expect(event.conversationId).toBe(testConversationId);
    });
  });

  describe('logFormSubmitted (Requirement 11.3)', () => {
    it('should log submission with all field values', async () => {
      const fieldValues = {
        email: 'test@example.com',
        name: 'John Doe',
        phone: '+1234567890',
      };

      const event = await formEventService.logFormSubmitted({
        formSchemaId: testFormId,
        sessionId: testSessionId,
        fieldValues,
      });

      expect(event.eventType).toBe('submitted');
      expect(event.metadata).toEqual({ fieldValues });
    });

    it('should log submission with conversation ID', async () => {
      const event = await formEventService.logFormSubmitted({
        formSchemaId: testFormId,
        sessionId: testSessionId,
        conversationId: testConversationId,
        fieldValues: { email: 'test@example.com' },
      });

      expect(event.conversationId).toBe(testConversationId);
    });
  });


  describe('logFormAbandoned (Requirement 11.4)', () => {
    it('should log abandonment with point and reason', async () => {
      const event = await formEventService.logFormAbandoned({
        formSchemaId: testFormId,
        sessionId: testSessionId,
        abandonmentPoint: 'email',
        reason: 'User closed widget',
      });

      expect(event.eventType).toBe('abandoned');
      expect(event.metadata).toEqual({
        abandonmentPoint: 'email',
        reason: 'User closed widget',
      });
    });

    it('should log abandonment without reason', async () => {
      const event = await formEventService.logFormAbandoned({
        formSchemaId: testFormId,
        sessionId: testSessionId,
        abandonmentPoint: 'phone',
      });

      expect(event.eventType).toBe('abandoned');
      expect(event.metadata).toEqual({ abandonmentPoint: 'phone' });
    });

    it('should log abandonment with conversation ID', async () => {
      const event = await formEventService.logFormAbandoned({
        formSchemaId: testFormId,
        sessionId: testSessionId,
        conversationId: testConversationId,
      });

      expect(event.conversationId).toBe(testConversationId);
    });
  });

  describe('Event Retrieval', () => {
    it('should retrieve all events for a form', async () => {
      await formEventService.logFormActivation({
        formSchemaId: testFormId,
        sessionId: testSessionId,
      });
      await formEventService.logFieldCollected({
        formSchemaId: testFormId,
        sessionId: testSessionId,
        fieldName: 'email',
        fieldValue: 'test@example.com',
        attemptCount: 1,
      });

      const events = await formEventService.getEventsForForm(testFormId);

      expect(events).toHaveLength(2);
      expect(events.map((e) => e.eventType)).toContain('activated');
      expect(events.map((e) => e.eventType)).toContain('field_collected');
    });

    it('should retrieve events for a conversation', async () => {
      await formEventService.logFormActivation({
        formSchemaId: testFormId,
        sessionId: testSessionId,
        conversationId: testConversationId,
      });
      await formEventService.logFormSubmitted({
        formSchemaId: testFormId,
        sessionId: testSessionId,
        conversationId: testConversationId,
        fieldValues: { email: 'test@example.com' },
      });

      const events = await formEventService.getEventsForConversation(testConversationId);

      expect(events).toHaveLength(2);
      // Events should be in chronological order (asc)
      expect(events[0].eventType).toBe('activated');
      expect(events[1].eventType).toBe('submitted');
    });

    it('should retrieve events for a session', async () => {
      await formEventService.logFormActivation({
        formSchemaId: testFormId,
        sessionId: testSessionId,
      });
      await formEventService.logFormAbandoned({
        formSchemaId: testFormId,
        sessionId: testSessionId,
        reason: 'timeout',
      });

      const events = await formEventService.getEventsForSession(testSessionId);

      expect(events).toHaveLength(2);
    });
  });
});
