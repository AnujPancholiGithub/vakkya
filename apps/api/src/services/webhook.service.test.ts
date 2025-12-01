import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WebhookService, generateWebhookSignature, WebhookPayload } from './webhook.service.js';
import { prisma } from '../lib/prisma.js';
import { hashSync } from 'bcrypt';
import { randomBytes, createHmac } from 'crypto';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock sleep to avoid test timeouts
const mockSleep = vi.fn().mockResolvedValue(undefined);

describe('WebhookService', () => {
  const webhookService = new WebhookService(mockSleep);
  const testUserEmail = `webhook-test-${randomBytes(8).toString('hex')}@example.com`;
  let testUserId: string;
  let testProjectId: string;
  let testFormId: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    
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
        name: 'Webhook Test Project',
        widgetToken: randomBytes(32).toString('hex'),
      },
    });
    testProjectId = testProject.id;

    // Create test form with webhook
    const testForm = await prisma.formSchema.create({
      data: {
        projectId: testProjectId,
        name: 'Test Form',
        fields: [{ name: 'email', type: 'email', label: 'Email', required: true }],
        webhookUrl: 'https://example.com/webhook',
      },
    });
    testFormId = testForm.id;
  });

  afterEach(async () => {
    await prisma.formSubmission.deleteMany({ where: { formSchema: { projectId: testProjectId } } });
    await prisma.formSchema.deleteMany({ where: { projectId: testProjectId } });
    await prisma.project.deleteMany({ where: { id: testProjectId } });
    await prisma.user.deleteMany({ where: { email: testUserEmail } });
  });


  describe('generateWebhookSignature', () => {
    it('should generate valid HMAC-SHA256 signature', () => {
      const payload = '{"test":"data"}';
      const secret = 'test-secret';
      
      const signature = generateWebhookSignature(payload, secret);
      
      // Verify it matches expected HMAC
      const expected = createHmac('sha256', secret).update(payload).digest('hex');
      expect(signature).toBe(expected);
    });

    it('should generate different signatures for different payloads', () => {
      const secret = 'test-secret';
      const sig1 = generateWebhookSignature('{"a":1}', secret);
      const sig2 = generateWebhookSignature('{"a":2}', secret);
      
      expect(sig1).not.toBe(sig2);
    });

    it('should generate different signatures for different secrets', () => {
      const payload = '{"test":"data"}';
      const sig1 = generateWebhookSignature(payload, 'secret1');
      const sig2 = generateWebhookSignature(payload, 'secret2');
      
      expect(sig1).not.toBe(sig2);
    });
  });

  describe('deliverWebhook', () => {
    const testPayload: WebhookPayload = {
      event: 'form.submitted',
      timestamp: new Date().toISOString(),
      data: { email: 'test@example.com' },
      metadata: {
        formId: 'form-123',
        formName: 'Test Form',
        sessionId: 'session-123',
        submissionId: 'sub-123',
      },
    };

    it('should deliver webhook successfully on first attempt', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
      });

      const result = await webhookService.deliverWebhook(
        'https://example.com/webhook',
        testPayload
      );

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.attempts).toBe(1);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should include HMAC signature when secret is provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
      });

      await webhookService.deliverWebhook(
        'https://example.com/webhook',
        testPayload,
        'webhook-secret'
      );

      const callArgs = mockFetch.mock.calls[0];
      const headers = callArgs[1].headers;
      
      expect(headers['X-Vakkya-Signature']).toBeDefined();
      expect(headers['X-Vakkya-Event']).toBe('form.submitted');
      expect(headers['X-Vakkya-Timestamp']).toBe(testPayload.timestamp);
    });

    it('should retry on 5xx errors', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Internal Server Error' })
        .mockResolvedValueOnce({ ok: true, status: 200, statusText: 'OK' });

      const result = await webhookService.deliverWebhook(
        'https://example.com/webhook',
        testPayload
      );

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(2);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should retry on 429 rate limit', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 429, statusText: 'Too Many Requests' })
        .mockResolvedValueOnce({ ok: true, status: 200, statusText: 'OK' });

      const result = await webhookService.deliverWebhook(
        'https://example.com/webhook',
        testPayload
      );

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(2);
    });

    it('should NOT retry on 4xx errors (except 429)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      });

      const result = await webhookService.deliverWebhook(
        'https://example.com/webhook',
        testPayload
      );

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(400);
      expect(result.attempts).toBe(1);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should fail after max retries', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const result = await webhookService.deliverWebhook(
        'https://example.com/webhook',
        testPayload
      );

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(4); // 1 initial + 3 retries
      expect(result.error).toContain('500');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await webhookService.deliverWebhook(
        'https://example.com/webhook',
        testPayload
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });


  describe('submitForm', () => {
    it('should create submission and deliver webhook', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
      });

      const result = await webhookService.submitForm(
        testFormId,
        'session-123',
        { email: 'user@example.com' }
      );

      expect(result.submissionId).toBeDefined();
      expect(result.webhookResult?.success).toBe(true);

      // Verify submission was created
      const submission = await prisma.formSubmission.findUnique({
        where: { id: result.submissionId },
      });
      expect(submission).not.toBeNull();
      expect(submission?.webhookSent).toBe(true);
    });

    it('should create submission without webhook if not configured', async () => {
      // Create form without webhook
      const formNoWebhook = await prisma.formSchema.create({
        data: {
          projectId: testProjectId,
          name: 'No Webhook Form',
          fields: [{ name: 'name', type: 'string', label: 'Name', required: true }],
          webhookUrl: null,
        },
      });

      const result = await webhookService.submitForm(
        formNoWebhook.id,
        'session-456',
        { name: 'John' }
      );

      expect(result.submissionId).toBeDefined();
      expect(result.webhookResult).toBeUndefined();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should mark webhookSent as false when delivery fails', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const result = await webhookService.submitForm(
        testFormId,
        'session-789',
        { email: 'fail@example.com' }
      );

      expect(result.webhookResult?.success).toBe(false);

      const submission = await prisma.formSubmission.findUnique({
        where: { id: result.submissionId },
      });
      expect(submission?.webhookSent).toBe(false);
    });

    it('should throw error for non-existent form', async () => {
      await expect(
        webhookService.submitForm('nonexistent-id', 'session', { data: 'test' })
      ).rejects.toThrow('Form not found');
    });

    it('should include correct metadata in webhook payload', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
      });

      await webhookService.submitForm(
        testFormId,
        'session-meta',
        { email: 'meta@example.com' }
      );

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.event).toBe('form.submitted');
      expect(body.data).toEqual({ email: 'meta@example.com' });
      expect(body.metadata.formId).toBe(testFormId);
      expect(body.metadata.formName).toBe('Test Form');
      expect(body.metadata.sessionId).toBe('session-meta');
      expect(body.metadata.submissionId).toBeDefined();
      expect(body.timestamp).toBeDefined();
    });
  });

  describe('Property Tests', () => {
    it('Property 5: For any submission with webhook, attempt delivery and record outcome', async () => {
      // Test successful delivery
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, statusText: 'OK' });
      const successResult = await webhookService.submitForm(testFormId, 'prop-session-1', { email: 'a@b.com' });
      expect(successResult.webhookResult).toBeDefined();
      const successSub = await prisma.formSubmission.findUnique({ where: { id: successResult.submissionId } });
      expect(successSub?.webhookSent).toBe(true);

      // Test failed delivery
      mockFetch.mockResolvedValue({ ok: false, status: 500, statusText: 'Error' });
      const failResult = await webhookService.submitForm(testFormId, 'prop-session-2', { email: 'c@d.com' });
      expect(failResult.webhookResult).toBeDefined();
      expect(failResult.webhookResult?.success).toBe(false);
      const failSub = await prisma.formSubmission.findUnique({ where: { id: failResult.submissionId } });
      expect(failSub?.webhookSent).toBe(false);
    });
  });
});
