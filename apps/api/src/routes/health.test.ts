import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createApp } from '../app.js';
import { validateEnv } from '../config/env.js';
import { createLogger } from '../config/logger.js';

describe('Health Check Endpoints', () => {
  let app: Awaited<ReturnType<typeof createApp>>;

  beforeEach(async () => {
    const env = validateEnv();
    const logger = createLogger(env);
    app = await createApp(env, logger);
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('GET /health', () => {
    it('should return ok status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.status).toBe('ok');
    });

    it('should not require authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('GET /health/ready', () => {
    it('should return ready status when database is connected', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health/ready',
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.status).toBe('ready');
      expect(data.database).toBe('connected');
      expect(data.pgvector).toBe('enabled');
    });

    it('should not require authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health/ready',
      });

      // Should return 200 or 503, but not 401
      expect([200, 503]).toContain(response.statusCode);
    });
  });
});
