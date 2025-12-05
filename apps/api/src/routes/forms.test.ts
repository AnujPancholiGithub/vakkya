import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '../lib/prisma.js';
import { randomBytes } from 'crypto';
import { createApp } from '../app.js';
import { validateEnv } from '../config/env.js';
import { createLogger } from '../config/logger.js';
import type { FastifyInstance } from 'fastify';
import { signToken } from '../lib/jwt.js';

/**
 * Form Routes V2 Tests
 * Validates: Requirements 2.1, 9.1, 9.2, 9.3, 9.4, 9.5
 */
describe('Form Routes V2', () => {
  const testUserEmail = `form-routes-${randomBytes(8).toString('hex')}@example.com`;
  let testUserId: string;
  let testProjectId: string;
  let authToken: string;
  let app: FastifyInstance;
  let env: ReturnType<typeof validateEnv>;

  beforeEach(async () => {
    env = validateEnv();
    const logger = createLogger(env);
    app = await createApp(env, logger);

    // Create test user
    const testUser = await prisma.user.create({
      data: {
        email: testUserEmail,
        password: 'hashedpassword',
      },
    });
    testUserId = testUser.id;
    authToken = signToken({ userId: testUserId, email: testUserEmail }, env);

    // Create test project
    const testProject = await prisma.project.create({
      data: {
        userId: testUserId,
        name: 'Form Routes Test Project',
        widgetToken: randomBytes(32).toString('hex'),
      },
    });
    testProjectId = testProject.id;
  });

  afterEach(async () => {
    await app.close();
    await prisma.formEvent.deleteMany({ where: { formSchema: { projectId: testProjectId } } });
    await prisma.formSubmission.deleteMany({ where: { formSchema: { projectId: testProjectId } } });
    await prisma.formSchema.deleteMany({ where: { projectId: testProjectId } });
    await prisma.project.deleteMany({ where: { id: testProjectId } });
    await prisma.user.deleteMany({ where: { email: testUserEmail } });
  });


  describe('POST /projects/:id/forms - V2 fields (Requirements 9.1-9.4)', () => {
    it('should create form with all V2 fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/projects/${testProjectId}/forms`,
        headers: { Authorization: `Bearer ${authToken}` },
        payload: {
          name: 'Contact Form',
          description: 'A form for contacting us',
          fields: [{ name: 'email', type: 'email', label: 'Email', required: true }],
          triggerPhrases: ['contact us', 'get in touch'],
          greetingMessage: 'Hello! Let me help you get in touch.',
          completionMessage: 'Thanks for reaching out!',
          webhookUrl: 'https://example.com/webhook',
          webhookSecret: 'secret123',
          isActive: true,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.form.name).toBe('Contact Form');
      expect(body.form.description).toBe('A form for contacting us');
      expect(body.form.triggerPhrases).toEqual(['contact us', 'get in touch']);
      expect(body.form.greetingMessage).toBe('Hello! Let me help you get in touch.');
      expect(body.form.completionMessage).toBe('Thanks for reaching out!');
      expect(body.form.webhookSecret).toBe('secret123');
      expect(body.form.isActive).toBe(true);
    });

    it('should return 409 on trigger phrase conflict', async () => {
      // Create first form
      await app.inject({
        method: 'POST',
        url: `/projects/${testProjectId}/forms`,
        headers: { Authorization: `Bearer ${authToken}` },
        payload: {
          name: 'Form A',
          fields: [{ name: 'f', type: 'string', label: 'F', required: true }],
          triggerPhrases: ['contact us'],
        },
      });

      // Try to create second form with same trigger phrase
      const response = await app.inject({
        method: 'POST',
        url: `/projects/${testProjectId}/forms`,
        headers: { Authorization: `Bearer ${authToken}` },
        payload: {
          name: 'Form B',
          fields: [{ name: 'f', type: 'string', label: 'F', required: true }],
          triggerPhrases: ['contact us'],
        },
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('TRIGGER_PHRASE_CONFLICT');
      expect(body.error.conflicts).toBeDefined();
      expect(body.error.conflicts[0].phrase).toBe('contact us');
    });
  });

  describe('GET /projects/:id/forms - V2 fields', () => {
    it('should return forms with V2 fields', async () => {
      await prisma.formSchema.create({
        data: {
          projectId: testProjectId,
          name: 'Test Form',
          description: 'Test description',
          fields: [{ name: 'email', type: 'email', label: 'Email', required: true }],
          triggerPhrases: ['test phrase'],
          greetingMessage: 'Hello',
          completionMessage: 'Goodbye',
          isActive: true,
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: `/projects/${testProjectId}/forms`,
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.forms).toHaveLength(1);
      expect(body.forms[0].description).toBe('Test description');
      expect(body.forms[0].triggerPhrases).toEqual(['test phrase']);
      expect(body.forms[0].greetingMessage).toBe('Hello');
      expect(body.forms[0].completionMessage).toBe('Goodbye');
      expect(body.forms[0].isActive).toBe(true);
    });
  });


  describe('GET /projects/:id/forms/:formId - V2 fields', () => {
    it('should return form with all V2 fields', async () => {
      const form = await prisma.formSchema.create({
        data: {
          projectId: testProjectId,
          name: 'Detail Form',
          description: 'Detailed description',
          fields: [{ name: 'name', type: 'string', label: 'Name', required: true }],
          triggerPhrases: ['phrase one', 'phrase two'],
          greetingMessage: 'Welcome!',
          completionMessage: 'All done!',
          webhookUrl: 'https://example.com/hook',
          webhookSecret: 'mysecret',
          isActive: false,
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: `/projects/${testProjectId}/forms/${form.id}`,
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.form.description).toBe('Detailed description');
      expect(body.form.triggerPhrases).toEqual(['phrase one', 'phrase two']);
      expect(body.form.greetingMessage).toBe('Welcome!');
      expect(body.form.completionMessage).toBe('All done!');
      expect(body.form.webhookSecret).toBe('mysecret');
      expect(body.form.isActive).toBe(false);
    });
  });

  describe('PUT /projects/:id/forms/:formId - V2 fields', () => {
    it('should update V2 fields', async () => {
      const form = await prisma.formSchema.create({
        data: {
          projectId: testProjectId,
          name: 'Update Form',
          fields: [{ name: 'f', type: 'string', label: 'F', required: true }],
        },
      });

      const response = await app.inject({
        method: 'PUT',
        url: `/projects/${testProjectId}/forms/${form.id}`,
        headers: { Authorization: `Bearer ${authToken}` },
        payload: {
          description: 'Updated description',
          triggerPhrases: ['new phrase'],
          greetingMessage: 'New greeting',
          completionMessage: 'New completion',
          isActive: false,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.form.description).toBe('Updated description');
      expect(body.form.triggerPhrases).toEqual(['new phrase']);
      expect(body.form.greetingMessage).toBe('New greeting');
      expect(body.form.completionMessage).toBe('New completion');
      expect(body.form.isActive).toBe(false);
    });

    it('should return 409 on trigger phrase conflict during update', async () => {
      await prisma.formSchema.create({
        data: {
          projectId: testProjectId,
          name: 'Existing Form',
          fields: [{ name: 'f', type: 'string', label: 'F', required: true }],
          triggerPhrases: ['existing phrase'],
        },
      });

      const formToUpdate = await prisma.formSchema.create({
        data: {
          projectId: testProjectId,
          name: 'Form to Update',
          fields: [{ name: 'f', type: 'string', label: 'F', required: true }],
        },
      });

      const response = await app.inject({
        method: 'PUT',
        url: `/projects/${testProjectId}/forms/${formToUpdate.id}`,
        headers: { Authorization: `Bearer ${authToken}` },
        payload: {
          triggerPhrases: ['existing phrase'],
        },
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('TRIGGER_PHRASE_CONFLICT');
    });
  });


  describe('GET /internal/projects/:projectId/forms/all - All active forms (Requirement 2.1)', () => {
    it('should return all active forms with trigger phrases', async () => {
      // Create active form
      await prisma.formSchema.create({
        data: {
          projectId: testProjectId,
          name: 'Active Form 1',
          description: 'First active form',
          fields: [{ name: 'email', type: 'email', label: 'Email', required: true }],
          triggerPhrases: ['contact us', 'reach out'],
          greetingMessage: 'Hello!',
          completionMessage: 'Thanks!',
          isActive: true,
        },
      });

      await prisma.formSchema.create({
        data: {
          projectId: testProjectId,
          name: 'Active Form 2',
          description: 'Second active form',
          fields: [{ name: 'name', type: 'string', label: 'Name', required: true }],
          triggerPhrases: ['book appointment'],
          greetingMessage: 'Welcome!',
          completionMessage: 'Booked!',
          isActive: true,
        },
      });

      // Create inactive form (should not be returned)
      await prisma.formSchema.create({
        data: {
          projectId: testProjectId,
          name: 'Inactive Form',
          fields: [{ name: 'f', type: 'string', label: 'F', required: true }],
          isActive: false,
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: `/internal/projects/${testProjectId}/forms/all`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.forms).toHaveLength(2);
      
      // Verify all active forms are returned with required fields
      const formNames = body.forms.map((f: { name: string }) => f.name);
      expect(formNames).toContain('Active Form 1');
      expect(formNames).toContain('Active Form 2');
      expect(formNames).not.toContain('Inactive Form');

      // Verify V2 fields are included
      const form1 = body.forms.find((f: { name: string }) => f.name === 'Active Form 1');
      expect(form1.description).toBe('First active form');
      expect(form1.triggerPhrases).toEqual(['contact us', 'reach out']);
      expect(form1.greetingMessage).toBe('Hello!');
      expect(form1.completionMessage).toBe('Thanks!');
    });

    it('should return empty array when no active forms exist', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/internal/projects/${testProjectId}/forms/all`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.forms).toEqual([]);
    });

    it('should not require authentication (internal endpoint)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/internal/projects/${testProjectId}/forms/all`,
        // No Authorization header
      });

      expect(response.statusCode).toBe(200);
    });
  });

  /**
   * POST /internal/forms/:formId/submit - Internal form submission
   * Validates: Requirements 6.1, 6.2, 6.3, 6.4
   */
  describe('POST /internal/forms/:formId/submit - Form Submission Persistence', () => {
    let testFormId: string;

    beforeEach(async () => {
      // Create a test form for submission tests
      const form = await prisma.formSchema.create({
        data: {
          projectId: testProjectId,
          name: 'Submission Test Form',
          fields: [
            { name: 'email', type: 'email', label: 'Email', required: true },
            { name: 'name', type: 'string', label: 'Name', required: true },
          ],
          isActive: true,
        },
      });
      testFormId = form.id;
    });

    it('should create FormSubmission record with status completed (Requirement 6.3)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/internal/forms/${testFormId}/submit`,
        payload: {
          sessionId: 'test-session-123',
          data: {
            email: 'test@example.com',
            name: 'John Doe',
          },
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.submission.id).toBeDefined();

      // Verify the submission was created with correct status
      const submission = await prisma.formSubmission.findUnique({
        where: { id: body.submission.id },
      });
      expect(submission).not.toBeNull();
      expect(submission?.status).toBe('completed');
      expect(submission?.formSchemaId).toBe(testFormId);
      expect(submission?.sessionId).toBe('test-session-123');
    });

    it('should store all field values in submission (Requirement 6.2)', async () => {
      const submissionData = {
        email: 'user@example.com',
        name: 'Jane Smith',
        phone: '+1234567890',
        notes: 'Additional notes here',
      };

      const response = await app.inject({
        method: 'POST',
        url: `/internal/forms/${testFormId}/submit`,
        payload: {
          sessionId: 'test-session-456',
          data: submissionData,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);

      // Verify all field values are stored
      const submission = await prisma.formSubmission.findUnique({
        where: { id: body.submission.id },
      });
      expect(submission?.data).toEqual(submissionData);
    });

    it('should return 400 for empty submission data', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/internal/forms/${testFormId}/submit`,
        payload: {
          sessionId: 'test-session-789',
          data: {},
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for missing sessionId', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/internal/forms/${testFormId}/submit`,
        payload: {
          data: { email: 'test@example.com' },
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 404 for non-existent form', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/internal/forms/clxxxxxxxxxxxxxxxxxxxxxxxxx/submit`,
        payload: {
          sessionId: 'test-session',
          data: { email: 'test@example.com' },
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('NOT_FOUND');
    });

    it('should not require authentication (internal endpoint)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/internal/forms/${testFormId}/submit`,
        // No Authorization header
        payload: {
          sessionId: 'no-auth-session',
          data: { email: 'noauth@example.com', name: 'No Auth' },
        },
      });

      expect(response.statusCode).toBe(201);
    });

    it('should return webhook delivery status when webhook is configured (Requirement 6.4)', async () => {
      // Create a form with webhook URL
      const formWithWebhook = await prisma.formSchema.create({
        data: {
          projectId: testProjectId,
          name: 'Webhook Form',
          fields: [{ name: 'email', type: 'email', label: 'Email', required: true }],
          webhookUrl: 'https://example.com/webhook',
          isActive: true,
        },
      });

      const response = await app.inject({
        method: 'POST',
        url: `/internal/forms/${formWithWebhook.id}/submit`,
        payload: {
          sessionId: 'webhook-test-session',
          data: { email: 'webhook@example.com' },
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      
      // Response should include webhook delivery info
      expect(body.submission.id).toBeDefined();
      // webhookDelivered will be null/false since the webhook URL doesn't exist
      // but the field should be present in the response
      expect('webhookDelivered' in body.submission).toBe(true);
      expect('webhookAttempts' in body.submission).toBe(true);
    });

    it('should not attempt webhook when not configured', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/internal/forms/${testFormId}/submit`,
        payload: {
          sessionId: 'no-webhook-session',
          data: { email: 'nowebhook@example.com', name: 'No Webhook' },
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      
      // webhookDelivered should be null when no webhook is configured
      expect(body.submission.webhookDelivered).toBeNull();
      expect(body.submission.webhookAttempts).toBeNull();
    });
  });
});
