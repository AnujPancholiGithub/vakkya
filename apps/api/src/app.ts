import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import type { Env } from './config/env.js';
import type { Logger } from 'pino';

export async function createApp(env: Env, logger: Logger) {
  const app = Fastify({
    logger,
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'requestId',
    disableRequestLogging: false,
    trustProxy: true,
  });

  // Security headers
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  });

  // CORS
  await app.register(cors, {
    origin: env.ALLOWED_ORIGINS,
    credentials: true,
  });

  // File uploads
  await app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
      files: 1,
    },
  });

  // Rate limiting (will be configured per route)
  await app.register(rateLimit, {
    global: false, // Enable per-route
  });

  // Health check routes (no auth required)
  app.get('/health', async () => {
    return { status: 'ok' };
  });

  app.get('/health/ready', async (request, reply) => {
    const { checkDatabaseHealth } = await import('./lib/db-health.js');
    const dbHealth = await checkDatabaseHealth();

    if (!dbHealth.connected) {
      reply.code(503);
      return {
        status: 'not_ready',
        database: 'disconnected',
        error: dbHealth.error,
      };
    }

    if (!dbHealth.pgvectorEnabled) {
      reply.code(503);
      return {
        status: 'not_ready',
        database: 'connected',
        pgvector: 'disabled',
      };
    }

    return {
      status: 'ready',
      database: 'connected',
      pgvector: 'enabled',
    };
  });

  return app;
}
