import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { conversationService } from '../services/conversation.service.js';
import { projectService } from '../services/project.service.js';
import type { Env } from '../config/env.js';

// Zod schemas for validation
const CreateConversationSchema = z.object({
  projectId: z.string().cuid(),
  sessionId: z.string().min(1),
  widgetToken: z.string().length(64), // For voice agent authentication
});

const AddTurnSchema = z.object({
  userQuery: z.string().min(1).max(5000).trim(),
  agentResponse: z.string().min(1).max(10000).trim(),
  widgetToken: z.string().length(64), // For voice agent authentication
});

const ConversationIdParamSchema = z.object({
  id: z.string().cuid(),
});

const ProjectIdParamSchema = z.object({
  projectId: z.string().cuid(),
});

export async function conversationRoutes(app: FastifyInstance, env: Env) {
  // POST /conversations - Create conversation (called by voice agent)
  app.post('/conversations', async (request, reply) => {
    try {
      const body = CreateConversationSchema.parse(request.body);

      // Validate widget token
      const projectConfig = await projectService.validateToken(body.widgetToken);
      if (!projectConfig || projectConfig.projectId !== body.projectId) {
        reply.code(401).send({
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid widget token',
            requestId: request.id,
          },
        });
        return;
      }

      const conversation = await conversationService.create({
        projectId: body.projectId,
        sessionId: body.sessionId,
      });

      reply.code(201).send({
        conversation: {
          id: conversation.id,
          projectId: conversation.projectId,
          sessionId: conversation.sessionId,
          startedAt: conversation.startedAt,
          turnCount: conversation.turnCount,
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

      request.log.error(error, 'Create conversation error');
      reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create conversation',
          requestId: request.id,
        },
      });
    }
  });

  // POST /conversations/:id/turns - Add turn (called by voice agent)
  app.post('/conversations/:id/turns', async (request, reply) => {
    try {
      const params = ConversationIdParamSchema.parse(request.params);
      const body = AddTurnSchema.parse(request.body);

      // Validate widget token
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

      // Add turn (service will validate conversation exists)
      const turn = await conversationService.addTurn(params.id, {
        userQuery: body.userQuery,
        agentResponse: body.agentResponse,
      });

      reply.code(201).send({
        turn: {
          id: turn.id,
          conversationId: turn.conversationId,
          userQuery: turn.userQuery,
          agentResponse: turn.agentResponse,
          timestamp: turn.timestamp,
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
            code: 'CONVERSATION_NOT_FOUND',
            message: error.message,
            requestId: request.id,
          },
        });
        return;
      }

      request.log.error(error, 'Add turn error');
      reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to add turn',
          requestId: request.id,
        },
      });
    }
  });

  // GET /projects/:projectId/conversations - List conversations (dashboard)
  app.get('/projects/:projectId/conversations', async (request, reply) => {
    try {
      // Authenticate user
      await authMiddleware(request, reply, env);
      if (reply.sent) return;

      const params = ProjectIdParamSchema.parse(request.params);
      const userId = request.user!.id;

      // Verify user owns the project
      await projectService.get(userId, params.projectId);

      const conversations = await conversationService.list(params.projectId);

      reply.send({
        conversations: conversations.map((c) => ({
          id: c.id,
          projectId: c.projectId,
          sessionId: c.sessionId,
          startedAt: c.startedAt,
          turnCount: c.turnCount,
        })),
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

      request.log.error(error, 'List conversations error');
      reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to list conversations',
          requestId: request.id,
        },
      });
    }
  });

  // GET /conversations/:id - Get conversation detail (dashboard)
  app.get('/conversations/:id', async (request, reply) => {
    try {
      // Authenticate user
      await authMiddleware(request, reply, env);
      if (reply.sent) return;

      const params = ConversationIdParamSchema.parse(request.params);
      const userId = request.user!.id;

      // Get conversation with ownership validation in a single query
      const conversation = await conversationService.getWithOwnership(
        params.id,
        userId
      );

      if (!conversation) {
        reply.code(404).send({
          error: {
            code: 'CONVERSATION_NOT_FOUND',
            message: 'Conversation not found or access denied',
            requestId: request.id,
          },
        });
        return;
      }

      reply.send({
        conversation: {
          id: conversation.id,
          projectId: conversation.projectId,
          sessionId: conversation.sessionId,
          startedAt: conversation.startedAt,
          turnCount: conversation.turnCount,
          turns: conversation.turns.map((t) => ({
            id: t.id,
            userQuery: t.userQuery,
            agentResponse: t.agentResponse,
            timestamp: t.timestamp,
          })),
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        reply.code(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid conversation ID',
            details: error.errors,
            requestId: request.id,
          },
        });
        return;
      }

      if (error instanceof Error && error.message.includes('not found')) {
        reply.code(404).send({
          error: {
            code: 'CONVERSATION_NOT_FOUND',
            message: error.message,
            requestId: request.id,
          },
        });
        return;
      }

      request.log.error(error, 'Get conversation error');
      reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get conversation',
          requestId: request.id,
        },
      });
    }
  });
}
