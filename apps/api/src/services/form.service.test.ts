import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FormService } from './form.service.js';
import { prisma } from '../lib/prisma.js';
import { hashSync } from 'bcrypt';
import { randomBytes } from 'crypto';

describe('FormService', () => {
  const formService = new FormService();
  const testUserEmail = `form-test-${randomBytes(8).toString('hex')}@example.com`;
  const otherUserEmail = `form-other-${randomBytes(8).toString('hex')}@example.com`;
  let testUserId: string;
  let otherUserId: string;
  let testProjectId: string;
  let otherProjectId: string;

  beforeEach(async () => {
    // Create test users
    const testUser = await prisma.user.create({
      data: {
        email: testUserEmail,
        password: hashSync('password123', 10),
      },
    });
    testUserId = testUser.id;

    const otherUser = await prisma.user.create({
      data: {
        email: otherUserEmail,
        password: hashSync('password123', 10),
      },
    });
    otherUserId = otherUser.id;

    // Create test projects
    const testProject = await prisma.project.create({
      data: {
        userId: testUserId,
        name: 'Test Project',
        widgetToken: randomBytes(32).toString('hex'),
      },
    });
    testProjectId = testProject.id;

    const otherProject = await prisma.project.create({
      data: {
        userId: otherUserId,
        name: 'Other Project',
        widgetToken: randomBytes(32).toString('hex'),
      },
    });
    otherProjectId = otherProject.id;
  });


  afterEach(async () => {
    // Clean up in order (submissions -> forms -> projects -> users)
    await prisma.formSubmission.deleteMany({
      where: {
        formSchema: {
          projectId: { in: [testProjectId, otherProjectId] },
        },
      },
    });
    await prisma.formSchema.deleteMany({
      where: { projectId: { in: [testProjectId, otherProjectId] } },
    });
    await prisma.project.deleteMany({
      where: { id: { in: [testProjectId, otherProjectId] } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: [testUserEmail, otherUserEmail] } },
    });
  });

  describe('createFormSchema', () => {
    it('should create a form schema with valid data', async () => {
      const form = await formService.createFormSchema(testUserId, testProjectId, {
        name: 'Contact Form',
        fields: [
          { name: 'email', type: 'email', label: 'Email Address', required: true },
          { name: 'message', type: 'text', label: 'Message', required: true },
        ],
      });

      expect(form.id).toBeDefined();
      expect(form.name).toBe('Contact Form');
      expect(form.projectId).toBe(testProjectId);
      expect(form.fields).toHaveLength(2);
    });

    it('should create form with webhook URL', async () => {
      const form = await formService.createFormSchema(testUserId, testProjectId, {
        name: 'Lead Form',
        fields: [{ name: 'name', type: 'string', label: 'Name', required: true }],
        webhookUrl: 'https://example.com/webhook',
      });

      expect(form.webhookUrl).toBe('https://example.com/webhook');
    });

    it('should reject when project not found', async () => {
      await expect(
        formService.createFormSchema(testUserId, 'nonexistent-id', {
          name: 'Test',
          fields: [{ name: 'f', type: 'string', label: 'F', required: true }],
        })
      ).rejects.toThrow('Project not found or access denied');
    });

    it('should reject when user does not own project', async () => {
      await expect(
        formService.createFormSchema(testUserId, otherProjectId, {
          name: 'Test',
          fields: [{ name: 'f', type: 'string', label: 'F', required: true }],
        })
      ).rejects.toThrow('Project not found or access denied');
    });
  });

  describe('listFormSchemas', () => {
    it('should list all forms for a project', async () => {
      await formService.createFormSchema(testUserId, testProjectId, {
        name: 'Form 1',
        fields: [{ name: 'f1', type: 'string', label: 'F1', required: true }],
      });
      await formService.createFormSchema(testUserId, testProjectId, {
        name: 'Form 2',
        fields: [{ name: 'f2', type: 'string', label: 'F2', required: true }],
      });

      const forms = await formService.listFormSchemas(testUserId, testProjectId);

      expect(forms).toHaveLength(2);
      expect(forms[0]._count.submissions).toBe(0);
    });

    it('should return empty array for project with no forms', async () => {
      const forms = await formService.listFormSchemas(testUserId, testProjectId);
      expect(forms).toHaveLength(0);
    });

    it('should reject when user does not own project', async () => {
      await expect(
        formService.listFormSchemas(testUserId, otherProjectId)
      ).rejects.toThrow('Project not found or access denied');
    });
  });


  describe('getFormSchema', () => {
    it('should get form by ID', async () => {
      const created = await formService.createFormSchema(testUserId, testProjectId, {
        name: 'Get Test',
        fields: [{ name: 'f', type: 'string', label: 'F', required: true }],
      });

      const form = await formService.getFormSchema(testUserId, testProjectId, created.id);

      expect(form.id).toBe(created.id);
      expect(form.name).toBe('Get Test');
    });

    it('should reject when form not found', async () => {
      await expect(
        formService.getFormSchema(testUserId, testProjectId, 'nonexistent-id')
      ).rejects.toThrow('Form not found');
    });

    it('should reject when user does not own project', async () => {
      const created = await formService.createFormSchema(otherUserId, otherProjectId, {
        name: 'Other Form',
        fields: [{ name: 'f', type: 'string', label: 'F', required: true }],
      });

      await expect(
        formService.getFormSchema(testUserId, otherProjectId, created.id)
      ).rejects.toThrow('Project not found or access denied');
    });
  });

  describe('updateFormSchema', () => {
    it('should update form name', async () => {
      const created = await formService.createFormSchema(testUserId, testProjectId, {
        name: 'Original',
        fields: [{ name: 'f', type: 'string', label: 'F', required: true }],
      });

      const updated = await formService.updateFormSchema(
        testUserId,
        testProjectId,
        created.id,
        { name: 'Updated' }
      );

      expect(updated.name).toBe('Updated');
    });

    it('should update form fields', async () => {
      const created = await formService.createFormSchema(testUserId, testProjectId, {
        name: 'Test',
        fields: [{ name: 'f1', type: 'string', label: 'F1', required: true }],
      });

      const updated = await formService.updateFormSchema(
        testUserId,
        testProjectId,
        created.id,
        {
          fields: [
            { name: 'f1', type: 'string', label: 'F1', required: true },
            { name: 'f2', type: 'email', label: 'F2', required: false },
          ],
        }
      );

      expect(updated.fields).toHaveLength(2);
    });

    it('should reject when user does not own project', async () => {
      const created = await formService.createFormSchema(otherUserId, otherProjectId, {
        name: 'Other',
        fields: [{ name: 'f', type: 'string', label: 'F', required: true }],
      });

      await expect(
        formService.updateFormSchema(testUserId, otherProjectId, created.id, { name: 'Hacked' })
      ).rejects.toThrow('Project not found or access denied');
    });
  });

  describe('deleteFormSchema', () => {
    it('should delete form', async () => {
      const created = await formService.createFormSchema(testUserId, testProjectId, {
        name: 'To Delete',
        fields: [{ name: 'f', type: 'string', label: 'F', required: true }],
      });

      await formService.deleteFormSchema(testUserId, testProjectId, created.id);

      await expect(
        formService.getFormSchema(testUserId, testProjectId, created.id)
      ).rejects.toThrow('Form not found');
    });

    it('should reject when user does not own project', async () => {
      const created = await formService.createFormSchema(otherUserId, otherProjectId, {
        name: 'Protected',
        fields: [{ name: 'f', type: 'string', label: 'F', required: true }],
      });

      await expect(
        formService.deleteFormSchema(testUserId, otherProjectId, created.id)
      ).rejects.toThrow('Project not found or access denied');
    });
  });

  describe('listSubmissions', () => {
    it('should list submissions for a form', async () => {
      const form = await formService.createFormSchema(testUserId, testProjectId, {
        name: 'Submission Test',
        fields: [{ name: 'email', type: 'email', label: 'Email', required: true }],
      });

      // Create test submissions directly
      await prisma.formSubmission.create({
        data: {
          formSchemaId: form.id,
          sessionId: 'session-1',
          data: { email: 'test1@example.com' },
        },
      });
      await prisma.formSubmission.create({
        data: {
          formSchemaId: form.id,
          sessionId: 'session-2',
          data: { email: 'test2@example.com' },
        },
      });

      const submissions = await formService.listSubmissions(testUserId, testProjectId, form.id);

      expect(submissions).toHaveLength(2);
    });

    it('should return empty array for form with no submissions', async () => {
      const form = await formService.createFormSchema(testUserId, testProjectId, {
        name: 'Empty Form',
        fields: [{ name: 'f', type: 'string', label: 'F', required: true }],
      });

      const submissions = await formService.listSubmissions(testUserId, testProjectId, form.id);

      expect(submissions).toHaveLength(0);
    });
  });

  describe('getFormSchemaById', () => {
    it('should get form by ID without auth check', async () => {
      const created = await formService.createFormSchema(testUserId, testProjectId, {
        name: 'Internal Test',
        fields: [{ name: 'f', type: 'string', label: 'F', required: true }],
      });

      const form = await formService.getFormSchemaById(created.id);

      expect(form).not.toBeNull();
      expect(form!.name).toBe('Internal Test');
    });

    it('should return null for non-existent form', async () => {
      const form = await formService.getFormSchemaById('nonexistent-id');
      expect(form).toBeNull();
    });
  });
});
