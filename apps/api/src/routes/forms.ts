import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { formService } from '../services/form.service.js';
import { webhookService } from '../services/webhook.service.js';
import {
  createFormSchemaSchema,
  updateFormSchemaSchema,
  projectIdParamSchema,
} from '@vakkya/schemas';
import type { Env } from '../config/env.js';

const FormIdParamsSchema = z.object({
  id: z.string().cuid(),
  formId: z.string().cuid(),
});

export async function formRoutes(app: FastifyInstance, env: Env) {
  // POST /projects/:id/forms - Create form schema
  app.post('/projects/:id/forms', async (request, reply) => {
    try {
      await authMiddleware(request, reply, env);
      if (reply.sent) return;

      const params = projectIdParamSchema.parse(request.params);
      const body = createFormSchemaSchema.parse(request.body);
      const userId = request.user!.id;

      const formSchema = await formService.createFormSchema(userId, params.id, body);

      reply.code(201).send({
        form: {
          id: formSchema.id,
          projectId: formSchema.projectId,
          name: formSchema.name,
          fields: formSchema.fields,
          webhookUrl: formSchema.webhookUrl,
          createdAt: formSchema.createdAt,
          updatedAt: formSchema.updatedAt,
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


      if (error instanceof Error && error.message.includes('not found')) {
        reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: error.message,
            requestId: request.id,
          },
        });
        return;
      }

      request.log.error(error, 'Create form error');
      reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create form',
          requestId: request.id,
        },
      });
    }
  });

  // GET /projects/:id/forms - List form schemas
  app.get('/projects/:id/forms', async (request, reply) => {
    try {
      await authMiddleware(request, reply, env);
      if (reply.sent) return;

      const params = projectIdParamSchema.parse(request.params);
      const userId = request.user!.id;

      const forms = await formService.listFormSchemas(userId, params.id);

      reply.send({
        forms: forms.map((f) => ({
          id: f.id,
          projectId: f.projectId,
          name: f.name,
          fields: f.fields,
          webhookUrl: f.webhookUrl,
          createdAt: f.createdAt,
          updatedAt: f.updatedAt,
          submissionCount: f._count.submissions,
        })),
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: error.message,
            requestId: request.id,
          },
        });
        return;
      }

      request.log.error(error, 'List forms error');
      reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to list forms',
          requestId: request.id,
        },
      });
    }
  });

  // GET /projects/:id/forms/:formId - Get form schema
  app.get('/projects/:id/forms/:formId', async (request, reply) => {
    try {
      await authMiddleware(request, reply, env);
      if (reply.sent) return;

      const params = FormIdParamsSchema.parse(request.params);
      const userId = request.user!.id;

      const form = await formService.getFormSchema(userId, params.id, params.formId);

      reply.send({
        form: {
          id: form.id,
          projectId: form.projectId,
          name: form.name,
          fields: form.fields,
          webhookUrl: form.webhookUrl,
          createdAt: form.createdAt,
          updatedAt: form.updatedAt,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        reply.code(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid parameters',
            details: error.errors,
            requestId: request.id,
          },
        });
        return;
      }

      if (error instanceof Error && error.message.includes('not found')) {
        reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: error.message,
            requestId: request.id,
          },
        });
        return;
      }

      request.log.error(error, 'Get form error');
      reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get form',
          requestId: request.id,
        },
      });
    }
  });


  // PUT /projects/:id/forms/:formId - Update form schema
  app.put('/projects/:id/forms/:formId', async (request, reply) => {
    try {
      await authMiddleware(request, reply, env);
      if (reply.sent) return;

      const params = FormIdParamsSchema.parse(request.params);
      const body = updateFormSchemaSchema.parse(request.body);
      const userId = request.user!.id;

      const form = await formService.updateFormSchema(userId, params.id, params.formId, body);

      reply.send({
        form: {
          id: form.id,
          projectId: form.projectId,
          name: form.name,
          fields: form.fields,
          webhookUrl: form.webhookUrl,
          createdAt: form.createdAt,
          updatedAt: form.updatedAt,
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
            code: 'NOT_FOUND',
            message: error.message,
            requestId: request.id,
          },
        });
        return;
      }

      request.log.error(error, 'Update form error');
      reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update form',
          requestId: request.id,
        },
      });
    }
  });

  // DELETE /projects/:id/forms/:formId - Delete form schema
  app.delete('/projects/:id/forms/:formId', async (request, reply) => {
    try {
      await authMiddleware(request, reply, env);
      if (reply.sent) return;

      const params = FormIdParamsSchema.parse(request.params);
      const userId = request.user!.id;

      await formService.deleteFormSchema(userId, params.id, params.formId);

      reply.code(204).send();
    } catch (error) {
      if (error instanceof z.ZodError) {
        reply.code(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid parameters',
            details: error.errors,
            requestId: request.id,
          },
        });
        return;
      }

      if (error instanceof Error && error.message.includes('not found')) {
        reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: error.message,
            requestId: request.id,
          },
        });
        return;
      }

      request.log.error(error, 'Delete form error');
      reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete form',
          requestId: request.id,
        },
      });
    }
  });

  // GET /projects/:id/forms/:formId/submissions - List submissions
  app.get('/projects/:id/forms/:formId/submissions', async (request, reply) => {
    try {
      await authMiddleware(request, reply, env);
      if (reply.sent) return;

      const params = FormIdParamsSchema.parse(request.params);
      const userId = request.user!.id;

      const submissions = await formService.listSubmissions(userId, params.id, params.formId);

      reply.send({
        submissions: submissions.map((s) => ({
          id: s.id,
          formSchemaId: s.formSchemaId,
          sessionId: s.sessionId,
          data: s.data,
          webhookSent: s.webhookSent,
          createdAt: s.createdAt,
        })),
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        reply.code(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid parameters',
            details: error.errors,
            requestId: request.id,
          },
        });
        return;
      }

      if (error instanceof Error && error.message.includes('not found')) {
        reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: error.message,
            requestId: request.id,
          },
        });
        return;
      }

      request.log.error(error, 'List submissions error');
      reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to list submissions',
          requestId: request.id,
        },
      });
    }
  });

  // POST /internal/forms/:formId/submit - Internal form submission (from voice agent)
  // No auth required - called by voice agent with form data
  const InternalFormIdSchema = z.object({
    formId: z.string().cuid(),
  });

  const InternalSubmitBodySchema = z.object({
    sessionId: z.string().min(1, 'Session ID is required'),
    data: z.record(z.any()).refine(
      (data) => Object.keys(data).length > 0,
      { message: 'Submission data cannot be empty' }
    ),
  });

  // GET /internal/projects/:projectId/active-form - Get active form for project (from voice agent)
  // No auth required - called by voice agent to check if form mode should be active
  const InternalProjectIdSchema = z.object({
    projectId: z.string().cuid(),
  });

  app.get('/internal/projects/:projectId/active-form', async (request, reply) => {
    try {
      const params = InternalProjectIdSchema.parse(request.params);

      const form = await formService.getActiveFormForProject(params.projectId);

      if (!form) {
        reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'No active form for this project',
            requestId: request.id,
          },
        });
        return;
      }

      reply.send({
        form: {
          id: form.id,
          projectId: form.projectId,
          name: form.name,
          fields: form.fields,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        reply.code(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid parameters',
            details: error.errors,
            requestId: request.id,
          },
        });
        return;
      }

      request.log.error(error, 'Get active form error');
      reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get active form',
          requestId: request.id,
        },
      });
    }
  });

  app.post('/internal/forms/:formId/submit', async (request, reply) => {
    try {
      const params = InternalFormIdSchema.parse(request.params);
      const body = InternalSubmitBodySchema.parse(request.body);

      const result = await webhookService.submitForm(
        params.formId,
        body.sessionId,
        body.data
      );

      reply.code(201).send({
        submission: {
          id: result.submissionId,
          webhookDelivered: result.webhookResult?.success ?? null,
          webhookAttempts: result.webhookResult?.attempts ?? null,
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
            code: 'NOT_FOUND',
            message: error.message,
            requestId: request.id,
          },
        });
        return;
      }

      request.log.error(error, 'Internal form submission error');
      reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to submit form',
          requestId: request.id,
        },
      });
    }
  });
}
