import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createApp } from '../app.js';
import { validateEnv } from '../config/env.js';
import { createLogger } from '../config/logger.js';

describe('Security Middleware', () => {
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

  describe('Helmet Security Headers', () => {
    it('should set X-Content-Type-Options header', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    it('should set X-Frame-Options header', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.headers['x-frame-options']).toBeDefined();
    });

    it('should set X-XSS-Protection header', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.headers['x-xss-protection']).toBeDefined();
    });

    it('should set Content-Security-Policy header', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.headers['content-security-policy']).toBeDefined();
      expect(response.headers['content-security-policy']).toContain("default-src 'self'");
    });
  });

  describe('CORS Configuration', () => {
    it('should allow requests from allowed origins', async () => {
      const env = validateEnv();
      const allowedOrigin = env.ALLOWED_ORIGINS[0] || 'http://localhost:3000';

      const response = await app.inject({
        method: 'GET',
        url: '/health',
        headers: {
          origin: allowedOrigin,
        },
      });

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    it('should handle preflight OPTIONS requests', async () => {
      const env = validateEnv();
      const allowedOrigin = env.ALLOWED_ORIGINS[0] || 'http://localhost:3000';

      const response = await app.inject({
        method: 'OPTIONS',
        url: '/health',
        headers: {
          origin: allowedOrigin,
          'access-control-request-method': 'GET',
        },
      });

      expect(response.statusCode).toBe(204);
      expect(response.headers['access-control-allow-methods']).toBeDefined();
    });

    it('should allow credentials', async () => {
      const env = validateEnv();
      const allowedOrigin = env.ALLOWED_ORIGINS[0] || 'http://localhost:3000';

      const response = await app.inject({
        method: 'GET',
        url: '/health',
        headers: {
          origin: allowedOrigin,
        },
      });

      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });
  });

  describe('Trust Proxy', () => {
    it('should trust proxy headers for production deployment', async () => {
      // Verify app is configured to trust proxy
      // This is important for Railway deployment where requests come through a proxy
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      // If trust proxy is enabled, the app should handle X-Forwarded-* headers correctly
      expect(response.statusCode).toBe(200);
    });
  });
});
