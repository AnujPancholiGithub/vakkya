import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { projectService } from '../services/project.service.js';
import type { Env } from '../config/env.js';

// Zod schemas for validation
const CreateProjectSchema = z.object({
  name: z.string().min(1).max(100),
});

const UpdateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
});

const ProjectIdParamSchema = z.object({
  id: z.string().cuid(),
});

export async function projectRoutes(app: FastifyInstance, env: Env) {
  // POST /projects - Create project
  app.post('/projects', async (request, reply) => {
    try {
      // Authenticate user
      await authMiddleware(request, reply, env);
      if (reply.sent) return;

      const body = CreateProjectSchema.parse(request.body);
      const userId = request.user!.id;

      const project = await projectService.create({
        userId,
        name: body.name,
      });

      reply.code(201).send({
        project: {
          id: project.id,
          name: project.name,
          widgetToken: project.widgetToken,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
        },
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

      if (error instanceof Error && error.message.includes('Project limit reached')) {
        reply.code(400).send({
          error: {
            code: 'PROJECT_LIMIT_REACHED',
            message: error.message,
            requestId: request.id,
          },
        });
        return;
      }

      request.log.error(error, 'Create project error');
      reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create project',
          requestId: request.id,
        },
      });
    }
  });

  // GET /projects - List user's projects
  app.get('/projects', async (request, reply) => {
    try {
      // Authenticate user
      await authMiddleware(request, reply, env);
      if (reply.sent) return;

      const userId = request.user!.id;
      const projects = await projectService.list(userId);

      reply.send({
        projects: projects.map((p) => ({
          id: p.id,
          name: p.name,
          widgetToken: p.widgetToken,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        })),
      });
    } catch (error) {
      request.log.error(error, 'List projects error');
      reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to list projects',
          requestId: request.id,
        },
      });
    }
  });

  // GET /projects/:id - Get project details
  app.get('/projects/:id', async (request, reply) => {
    try {
      // Authenticate user
      await authMiddleware(request, reply, env);
      if (reply.sent) return;

      const params = ProjectIdParamSchema.parse(request.params);
      const userId = request.user!.id;

      const project = await projectService.get(userId, params.id);

      reply.send({
        project: {
          id: project.id,
          name: project.name,
          widgetToken: project.widgetToken,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        reply.code(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid project ID',
            details: error.errors,
            requestId: request.id,
          },
        });
        return;
      }

      if (error instanceof Error && error.message.includes('not found')) {
        reply.code(404).send({
          error: {
            code: 'PROJECT_NOT_FOUND',
            message: error.message,
            requestId: request.id,
          },
        });
        return;
      }

      request.log.error(error, 'Get project error');
      reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get project',
          requestId: request.id,
        },
      });
    }
  });

  // PATCH /projects/:id - Update project
  app.patch('/projects/:id', async (request, reply) => {
    try {
      // Authenticate user
      await authMiddleware(request, reply, env);
      if (reply.sent) return;

      const params = ProjectIdParamSchema.parse(request.params);
      const body = UpdateProjectSchema.parse(request.body);
      const userId = request.user!.id;

      const project = await projectService.update(userId, params.id, body);

      reply.send({
        project: {
          id: project.id,
          name: project.name,
          widgetToken: project.widgetToken,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        reply.code(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request',
            details: error.errors,
            requestId: request.id,
          },
        });
        return;
      }

      if (error instanceof Error && error.message.includes('not found')) {
        reply.code(404).send({
          error: {
            code: 'PROJECT_NOT_FOUND',
            message: error.message,
            requestId: request.id,
          },
        });
        return;
      }

      request.log.error(error, 'Update project error');
      reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update project',
          requestId: request.id,
        },
      });
    }
  });

  // DELETE /projects/:id - Delete project
  app.delete('/projects/:id', async (request, reply) => {
    try {
      // Authenticate user
      await authMiddleware(request, reply, env);
      if (reply.sent) return;

      const params = ProjectIdParamSchema.parse(request.params);
      const userId = request.user!.id;

      await projectService.delete(userId, params.id);

      reply.code(204).send();
    } catch (error) {
      if (error instanceof z.ZodError) {
        reply.code(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid project ID',
            details: error.errors,
            requestId: request.id,
          },
        });
        return;
      }

      if (error instanceof Error && error.message.includes('not found')) {
        reply.code(404).send({
          error: {
            code: 'PROJECT_NOT_FOUND',
            message: error.message,
            requestId: request.id,
          },
        });
        return;
      }

      request.log.error(error, 'Delete project error');
      reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete project',
          requestId: request.id,
        },
      });
    }
  });
}
