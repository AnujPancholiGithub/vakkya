import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';

/**
 * Global error handler for Fastify
 * Transforms all errors into consistent JSON format
 * Logs errors and includes request ID for tracing
 */
export function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) {
  // Log the error with context
  request.log.error(
    {
      err: error,
      requestId: request.id,
      url: request.url,
      method: request.method,
    },
    'Request error'
  );

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return reply.code(400).send({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: error.errors.map((err) => ({
          path: err.path.join('.'),
          message: err.message,
        })),
        requestId: request.id,
      },
    });
  }

  // Handle Fastify validation errors
  if (error.validation) {
    return reply.code(400).send({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: error.validation,
        requestId: request.id,
      },
    });
  }

  // Handle known HTTP errors
  if (error.statusCode && error.statusCode < 500) {
    return reply.code(error.statusCode).send({
      error: {
        code: error.code || 'CLIENT_ERROR',
        message: error.message,
        requestId: request.id,
      },
    });
  }

  // Handle 500 errors - never expose internal details
  return reply.code(500).send({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An internal server error occurred',
      requestId: request.id,
    },
  });
}
