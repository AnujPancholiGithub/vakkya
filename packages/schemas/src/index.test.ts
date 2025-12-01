import { describe, it, expect } from 'vitest';
import {
  createProjectSchema,
  createUserSchema,
  MAX_FILE_SIZE,
  MAX_PROJECTS_PER_USER,
  ERROR_CODES,
  createFormSchemaSchema,
  formFieldSchema,
  formSubmissionSchema,
} from './index.js';

describe('@vakkya/schemas', () => {
  describe('createProjectSchema', () => {
    it('should validate valid project name', () => {
      const result = createProjectSchema.safeParse({ name: 'My Project' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('My Project');
      }
    });

    it('should reject empty project name', () => {
      const result = createProjectSchema.safeParse({ name: '' });
      expect(result.success).toBe(false);
    });

    it('should trim whitespace', () => {
      const result = createProjectSchema.safeParse({ name: '  My Project  ' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('My Project');
      }
    });

    it('should reject names over 100 characters', () => {
      const result = createProjectSchema.safeParse({ name: 'a'.repeat(101) });
      expect(result.success).toBe(false);
    });
  });

  describe('createUserSchema', () => {
    it('should validate valid email and password', () => {
      const result = createUserSchema.safeParse({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const result = createUserSchema.safeParse({
        email: 'invalid-email',
        password: 'password123',
      });
      expect(result.success).toBe(false);
    });

    it('should reject short password', () => {
      const result = createUserSchema.safeParse({
        email: 'test@example.com',
        password: 'short',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('constants', () => {
    it('should export correct file size limit', () => {
      expect(MAX_FILE_SIZE).toBe(10 * 1024 * 1024);
    });

    it('should export correct project limit', () => {
      expect(MAX_PROJECTS_PER_USER).toBe(10);
    });

    it('should export error codes', () => {
      expect(ERROR_CODES.UNAUTHORIZED).toBe('UNAUTHORIZED');
      expect(ERROR_CODES.PROJECT_LIMIT_REACHED).toBe('PROJECT_LIMIT_REACHED');
    });
  });
});

describe('Form Schema Validation', () => {
  describe('formFieldSchema', () => {
    it('should validate a valid string field', () => {
      const result = formFieldSchema.safeParse({
        name: 'firstName',
        type: 'string',
        label: 'First Name',
        required: true,
      });
      expect(result.success).toBe(true);
    });

    it('should validate a valid email field', () => {
      const result = formFieldSchema.safeParse({
        name: 'email',
        type: 'email',
        label: 'Email Address',
        required: true,
      });
      expect(result.success).toBe(true);
    });

    it('should validate an enum field with options', () => {
      const result = formFieldSchema.safeParse({
        name: 'country',
        type: 'enum',
        label: 'Country',
        required: true,
        options: ['USA', 'Canada', 'Mexico'],
      });
      expect(result.success).toBe(true);
    });

    it('should reject enum field without options', () => {
      const result = formFieldSchema.safeParse({
        name: 'country',
        type: 'enum',
        label: 'Country',
        required: true,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Options are required for enum fields');
      }
    });

    it('should reject enum field with empty options array', () => {
      const result = formFieldSchema.safeParse({
        name: 'country',
        type: 'enum',
        label: 'Country',
        required: true,
        options: [],
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid field type', () => {
      const result = formFieldSchema.safeParse({
        name: 'field',
        type: 'invalid',
        label: 'Field',
        required: true,
      });
      expect(result.success).toBe(false);
    });

    it('should reject field with empty name', () => {
      const result = formFieldSchema.safeParse({
        name: '',
        type: 'string',
        label: 'Field',
        required: true,
      });
      expect(result.success).toBe(false);
    });

    it('should set required to true by default', () => {
      const result = formFieldSchema.safeParse({
        name: 'field',
        type: 'string',
        label: 'Field',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.required).toBe(true);
      }
    });
  });

  describe('createFormSchemaSchema', () => {
    it('should validate a valid form schema', () => {
      const result = createFormSchemaSchema.safeParse({
        name: 'Contact Form',
        fields: [
          { name: 'name', type: 'string', label: 'Name', required: true },
          { name: 'email', type: 'email', label: 'Email', required: true },
        ],
      });
      expect(result.success).toBe(true);
    });

    it('should validate form schema with webhook URL', () => {
      const result = createFormSchemaSchema.safeParse({
        name: 'Contact Form',
        fields: [{ name: 'name', type: 'string', label: 'Name', required: true }],
        webhookUrl: 'https://example.com/webhook',
      });
      expect(result.success).toBe(true);
    });

    it('should reject form with no fields', () => {
      const result = createFormSchemaSchema.safeParse({
        name: 'Empty Form',
        fields: [],
      });
      expect(result.success).toBe(false);
    });

    it('should reject form with more than 50 fields', () => {
      const fields = Array.from({ length: 51 }, (_, i) => ({
        name: `field${i}`,
        type: 'string' as const,
        label: `Field ${i}`,
        required: true,
      }));
      const result = createFormSchemaSchema.safeParse({
        name: 'Large Form',
        fields,
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid webhook URL', () => {
      const result = createFormSchemaSchema.safeParse({
        name: 'Contact Form',
        fields: [{ name: 'name', type: 'string', label: 'Name', required: true }],
        webhookUrl: 'not-a-url',
      });
      expect(result.success).toBe(false);
    });

    it('should allow empty string for webhook URL', () => {
      const result = createFormSchemaSchema.safeParse({
        name: 'Contact Form',
        fields: [{ name: 'name', type: 'string', label: 'Name', required: true }],
        webhookUrl: '',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('formSubmissionSchema', () => {
    it('should validate a valid submission', () => {
      const result = formSubmissionSchema.safeParse({
        data: { name: 'John', email: 'john@example.com' },
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty submission data', () => {
      const result = formSubmissionSchema.safeParse({
        data: {},
      });
      expect(result.success).toBe(false);
    });

    it('should accept any data types in submission', () => {
      const result = formSubmissionSchema.safeParse({
        data: {
          name: 'John',
          age: 30,
          active: true,
          tags: ['tag1', 'tag2'],
        },
      });
      expect(result.success).toBe(true);
    });

    it('should validate submission with conversationId', () => {
      const result = formSubmissionSchema.safeParse({
        data: { name: 'John' },
        conversationId: 'clx1234567890abcdefgh',
      });
      expect(result.success).toBe(true);
    });
  });
});

describe('Form Schema V2 Validation - Property Tests', () => {
  describe('Property 19: Form Schema Validation', () => {
    it('should validate form with all V2 fields', () => {
      const result = createFormSchemaSchema.safeParse({
        name: 'Lead Capture Form',
        description: 'Collect leads for sales team',
        fields: [
          { name: 'name', type: 'string', label: 'Name', required: true },
          { name: 'email', type: 'email', label: 'Email', required: true },
        ],
        triggerPhrases: ['I want to sign up', 'interested in demo', 'contact sales'],
        greetingMessage: 'Hi! I can help you get started.',
        completionMessage: 'Thanks! Our team will reach out soon.',
        webhookUrl: 'https://example.com/webhook',
        webhookSecret: 'secret123',
        isActive: true,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.triggerPhrases).toHaveLength(3);
        expect(result.data.isActive).toBe(true);
      }
    });

    it('should validate form with minimal V2 fields', () => {
      const result = createFormSchemaSchema.safeParse({
        name: 'Simple Form',
        fields: [{ name: 'email', type: 'email', label: 'Email', required: true }],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        // Optional fields are undefined at schema level, defaults applied in form.service.ts
        expect(result.data.triggerPhrases).toBeUndefined();
        expect(result.data.isActive).toBeUndefined();
      }
    });

    it('should reject description over 500 characters', () => {
      const result = createFormSchemaSchema.safeParse({
        name: 'Form',
        description: 'a'.repeat(501),
        fields: [{ name: 'name', type: 'string', label: 'Name', required: true }],
      });
      expect(result.success).toBe(false);
    });

    it('should reject more than 20 trigger phrases', () => {
      const result = createFormSchemaSchema.safeParse({
        name: 'Form',
        fields: [{ name: 'name', type: 'string', label: 'Name', required: true }],
        triggerPhrases: Array.from({ length: 21 }, (_, i) => `phrase ${i}`),
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty trigger phrases', () => {
      const result = createFormSchemaSchema.safeParse({
        name: 'Form',
        fields: [{ name: 'name', type: 'string', label: 'Name', required: true }],
        triggerPhrases: ['valid phrase', '', 'another phrase'],
      });
      expect(result.success).toBe(false);
    });

    it('should reject trigger phrase over 100 characters', () => {
      const result = createFormSchemaSchema.safeParse({
        name: 'Form',
        fields: [{ name: 'name', type: 'string', label: 'Name', required: true }],
        triggerPhrases: ['a'.repeat(101)],
      });
      expect(result.success).toBe(false);
    });

    it('should reject greeting message over 500 characters', () => {
      const result = createFormSchemaSchema.safeParse({
        name: 'Form',
        fields: [{ name: 'name', type: 'string', label: 'Name', required: true }],
        greetingMessage: 'a'.repeat(501),
      });
      expect(result.success).toBe(false);
    });

    it('should reject completion message over 500 characters', () => {
      const result = createFormSchemaSchema.safeParse({
        name: 'Form',
        fields: [{ name: 'name', type: 'string', label: 'Name', required: true }],
        completionMessage: 'a'.repeat(501),
      });
      expect(result.success).toBe(false);
    });

    it('should reject webhook secret over 100 characters', () => {
      const result = createFormSchemaSchema.safeParse({
        name: 'Form',
        fields: [{ name: 'name', type: 'string', label: 'Name', required: true }],
        webhookSecret: 'a'.repeat(101),
      });
      expect(result.success).toBe(false);
    });

    it('should allow empty strings for optional text fields', () => {
      const result = createFormSchemaSchema.safeParse({
        name: 'Form',
        fields: [{ name: 'name', type: 'string', label: 'Name', required: true }],
        description: '',
        greetingMessage: '',
        completionMessage: '',
        webhookUrl: '',
        webhookSecret: '',
      });
      expect(result.success).toBe(true);
    });

    it('should allow isActive to be optional (defaults applied at service layer)', () => {
      const result = createFormSchemaSchema.safeParse({
        name: 'Form',
        fields: [{ name: 'name', type: 'string', label: 'Name', required: true }],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        // isActive is optional at schema level, defaults applied in form.service.ts
        expect(result.data.isActive).toBeUndefined();
      }
    });

    it('should allow triggerPhrases to be optional (defaults applied at service layer)', () => {
      const result = createFormSchemaSchema.safeParse({
        name: 'Form',
        fields: [{ name: 'name', type: 'string', label: 'Name', required: true }],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        // triggerPhrases is optional at schema level, defaults applied in form.service.ts
        expect(result.data.triggerPhrases).toBeUndefined();
      }
    });
  });
});
