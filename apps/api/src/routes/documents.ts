import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import {
  uploadDocument,
  listDocuments,
  getDocument,
  deleteDocument,
} from '../services/document.service.js';
import { validateDocument, getFileType } from '../lib/document-validation.js';
import type { Env } from '../config/env.js';
import type { MultipartFile } from '@fastify/multipart';

// Zod schemas for validation
const ProjectIdParamSchema = z.object({
  projectId: z.string().cuid(),
});

const DocumentIdParamSchema = z.object({
  projectId: z.string().cuid(),
  documentId: z.string().cuid(),
});

export async function documentRoutes(app: FastifyInstance, env: Env) {
  // POST /projects/:projectId/documents - Upload document
  app.post<{ Params: { projectId: string } }>(
    '/projects/:projectId/documents',
    async (request, reply) => {
      try {
        // Authenticate user
        await authMiddleware(request, reply, env);
        if (reply.sent) return;

        // Validate params
        const params = ProjectIdParamSchema.parse(request.params);
        const userId = request.user!.id;

        // Verify project ownership
        const { projectService } = await import('../services/project.service.js');
        const project = await projectService.get(userId, params.projectId);
        if (!project) {
          return reply.code(404).send({
            error: {
              code: 'PROJECT_NOT_FOUND',
              message: 'Project not found',
            },
          });
        }

        // Get uploaded file
        const data = await request.file();
        if (!data) {
          return reply.code(400).send({
            error: {
              code: 'NO_FILE',
              message: 'No file uploaded',
            },
          });
        }

        const file = data as MultipartFile;
        const filename = file.filename;
        const buffer = await file.toBuffer();

        // Validate file
        const validation = validateDocument(filename, buffer.length);
        if (!validation.valid) {
          return reply.code(400).send({
            error: {
              code: 'INVALID_FILE',
              message: validation.error,
            },
          });
        }

        const fileType = getFileType(filename);
        if (!fileType) {
          return reply.code(400).send({
            error: {
              code: 'INVALID_FILE_TYPE',
              message: 'Invalid file type',
            },
          });
        }

        // Upload and process document
        const result = await uploadDocument(params.projectId, filename, buffer, fileType);

        reply.code(201).send({
          document: result,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid request parameters',
              details: error.errors,
            },
          });
        }

        return reply.code(500).send({
          error: {
            code: 'UPLOAD_FAILED',
            message: error instanceof Error ? error.message : 'Failed to upload document',
          },
        });
      }
    }
  );

  // GET /projects/:projectId/documents - List documents
  app.get<{ Params: { projectId: string } }>(
    '/projects/:projectId/documents',
    async (request, reply) => {
      try {
        // Authenticate user
        await authMiddleware(request, reply, env);
        if (reply.sent) return;

        // Validate params
        const params = ProjectIdParamSchema.parse(request.params);
        const userId = request.user!.id;

        // Verify project ownership
        const { projectService } = await import('../services/project.service.js');
        const project = await projectService.get(userId, params.projectId);
        if (!project) {
          return reply.code(404).send({
            error: {
              code: 'PROJECT_NOT_FOUND',
              message: 'Project not found',
            },
          });
        }

        // List documents
        const documents = await listDocuments(params.projectId);

        reply.send({ documents });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid request parameters',
              details: error.errors,
            },
          });
        }

        return reply.code(500).send({
          error: {
            code: 'LIST_FAILED',
            message: 'Failed to list documents',
          },
        });
      }
    }
  );

  // GET /projects/:projectId/documents/:documentId - Get document details
  app.get<{ Params: { projectId: string; documentId: string } }>(
    '/projects/:projectId/documents/:documentId',
    async (request, reply) => {
      try {
        // Authenticate user
        await authMiddleware(request, reply, env);
        if (reply.sent) return;

        // Validate params
        const params = DocumentIdParamSchema.parse(request.params);
        const userId = request.user!.id;

        // Verify project ownership
        const { projectService } = await import('../services/project.service.js');
        const project = await projectService.get(userId, params.projectId);
        if (!project) {
          return reply.code(404).send({
            error: {
              code: 'PROJECT_NOT_FOUND',
              message: 'Project not found',
            },
          });
        }

        // Get document
        const document = await getDocument(params.projectId, params.documentId);
        if (!document) {
          return reply.code(404).send({
            error: {
              code: 'DOCUMENT_NOT_FOUND',
              message: 'Document not found',
            },
          });
        }

        reply.send({ document });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid request parameters',
              details: error.errors,
            },
          });
        }

        return reply.code(500).send({
          error: {
            code: 'GET_FAILED',
            message: 'Failed to get document',
          },
        });
      }
    }
  );

  // DELETE /projects/:projectId/documents/:documentId - Delete document
  app.delete<{ Params: { projectId: string; documentId: string } }>(
    '/projects/:projectId/documents/:documentId',
    async (request, reply) => {
      try {
        // Authenticate user
        await authMiddleware(request, reply, env);
        if (reply.sent) return;

        // Validate params
        const params = DocumentIdParamSchema.parse(request.params);
        const userId = request.user!.id;

        // Verify project ownership
        const { projectService } = await import('../services/project.service.js');
        const project = await projectService.get(userId, params.projectId);
        if (!project) {
          return reply.code(404).send({
            error: {
              code: 'PROJECT_NOT_FOUND',
              message: 'Project not found',
            },
          });
        }

        // Delete document
        await deleteDocument(params.projectId, params.documentId);

        reply.code(204).send();
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid request parameters',
              details: error.errors,
            },
          });
        }

        if (error instanceof Error && error.message.includes('not found')) {
          return reply.code(404).send({
            error: {
              code: 'DOCUMENT_NOT_FOUND',
              message: 'Document not found',
            },
          });
        }

        return reply.code(500).send({
          error: {
            code: 'DELETE_FAILED',
            message: 'Failed to delete document',
          },
        });
      }
    }
  );
}
