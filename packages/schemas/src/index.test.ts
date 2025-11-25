import { describe, it, expect } from 'vitest';
import {
  createProjectSchema,
  createUserSchema,
  MAX_FILE_SIZE,
  MAX_PROJECTS_PER_USER,
  ERROR_CODES,
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
