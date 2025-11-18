import { describe, it, expect } from 'vitest';
import { signToken, verifyToken } from './jwt.js';
import type { Env } from '../config/env.js';

// Mock environment for testing
const mockEnv: Env = {
  DATABASE_URL: 'postgresql://test',
  JWT_SECRET: 'test-secret-key-for-jwt-testing',
  JWT_EXPIRES_IN: '7d',
  OPENAI_API_KEY: 'test-key',
  ALLOWED_ORIGINS: ['http://localhost:3000'],
  PORT: 3000,
  NODE_ENV: 'test',
};

describe('JWT Authentication', () => {
  describe('signToken', () => {
    it('should sign a valid JWT token', () => {
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
      };

      const token = signToken(payload, mockEnv);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should include userId and email in token payload', () => {
      const payload = {
        userId: 'user-456',
        email: 'another@example.com',
      };

      const token = signToken(payload, mockEnv);
      const decoded = verifyToken(token, mockEnv);

      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.email).toBe(payload.email);
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      const payload = {
        userId: 'user-789',
        email: 'verify@example.com',
      };

      const token = signToken(payload, mockEnv);
      const decoded = verifyToken(token, mockEnv);

      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.email).toBe(payload.email);
    });

    it('should reject token with invalid signature', () => {
      const payload = {
        userId: 'user-999',
        email: 'invalid@example.com',
      };

      const token = signToken(payload, mockEnv);
      
      // Try to verify with different secret
      const differentEnv = { ...mockEnv, JWT_SECRET: 'different-secret' };

      expect(() => verifyToken(token, differentEnv)).toThrow('Invalid token');
    });

    it('should reject malformed token', () => {
      const malformedToken = 'not.a.valid.jwt.token';

      expect(() => verifyToken(malformedToken, mockEnv)).toThrow('Invalid token');
    });

    it('should reject empty token', () => {
      expect(() => verifyToken('', mockEnv)).toThrow('Invalid token');
    });

    it('should reject token with invalid format', () => {
      const invalidToken = 'Bearer token-without-proper-format';

      expect(() => verifyToken(invalidToken, mockEnv)).toThrow('Invalid token');
    });
  });
});
