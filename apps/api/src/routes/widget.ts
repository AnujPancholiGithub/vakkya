import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { projectService } from '../services/project.service.js';
import type { Env } from '../config/env.js';

// Zod schema for validation
const ValidateTokenSchema = z.object({
  widgetToken: z.string().length(64),
});

export async function widgetRoutes(app: FastifyInstance, _env: Env) {
  // POST /validate-token - Validate widget token and return project config
  app.post('/validate-token', async (request, reply) => {
    try {
      const body = ValidateTokenSchema.parse(request.body);

      // Validate token using project service
      const projectConfig = await projectService.validateToken(body.widgetToken);

      if (!projectConfig) {
        reply.code(401).send({
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid widget token',
            requestId: request.id,
          },
        });
        return;
      }

      // Return project configuration
      reply.send({
        projectId: projectConfig.projectId,
        projectName: projectConfig.name,
        allowedDomains: [], // TODO: Add domain whitelist feature in future
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        reply.code(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: error.errors,
            requestId: request.id,
          },
        });
        return;
      }

      request.log.error(error, 'Token validation error');
      reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to validate token',
          requestId: request.id,
        },
      });
    }
  });
}
