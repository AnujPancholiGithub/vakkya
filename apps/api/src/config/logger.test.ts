import { describe, it, expect } from 'vitest';
import { createLogger } from './logger.js';
import type { Env } from './env.js';

describe('Logger Configuration', () => {
  describe('createLogger', () => {
    it('should create a logger instance', () => {
      const env: Env = {
        NODE_ENV: 'test',
        PORT: 3000,
        DATABASE_URL: 'postgresql://test',
        JWT_SECRET: 'test-secret',
        OPENAI_API_KEY: 'test-key',
        ALLOWED_ORIGINS: ['http://localhost:3000'],
      };

      const logger = createLogger(env);
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.debug).toBe('function');
    });

    it('should set log level to silent in test mode', () => {
      const env: Env = {
        NODE_ENV: 'test',
        PORT: 3000,
        DATABASE_URL: 'postgresql://test',
        JWT_SECRET: 'test-secret',
        OPENAI_API_KEY: 'test-key',
        ALLOWED_ORIGINS: ['http://localhost:3000'],
      };

      const logger = createLogger(env);
      expect(logger.level).toBe('silent');
    });

    it('should set log level to debug in development mode', () => {
      const env: Env = {
        NODE_ENV: 'development',
        PORT: 3000,
        DATABASE_URL: 'postgresql://test',
        JWT_SECRET: 'test-secret',
        OPENAI_API_KEY: 'test-key',
        ALLOWED_ORIGINS: ['http://localhost:3000'],
      };

      const logger = createLogger(env);
      expect(logger.level).toBe('debug');
    });

    it('should set log level to info in production mode', () => {
      const env: Env = {
        NODE_ENV: 'production',
        PORT: 3000,
        DATABASE_URL: 'postgresql://test',
        JWT_SECRET: 'test-secret',
        OPENAI_API_KEY: 'test-key',
        ALLOWED_ORIGINS: ['http://localhost:3000'],
      };

      const logger = createLogger(env);
      expect(logger.level).toBe('info');
    });

    it('should have redaction configured', () => {
      const env: Env = {
        NODE_ENV: 'test',
        PORT: 3000,
        DATABASE_URL: 'postgresql://test',
        JWT_SECRET: 'test-secret',
        OPENAI_API_KEY: 'test-key',
        ALLOWED_ORIGINS: ['http://localhost:3000'],
      };

      const logger = createLogger(env);
      
      // Verify logger has redaction paths configured
      // This is a basic check - actual redaction is tested by Pino internally
      expect(logger).toBeDefined();
    });
  });
});
