/**
 * Shared Zod validation schemas for Vakkya
 * Used for form validation and API request validation
 */

import { z } from 'zod';

// User validation schemas
export const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be less than 100 characters'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Project validation schemas
export const createProjectSchema = z.object({
  name: z
    .string()
    .min(1, 'Project name is required')
    .max(100, 'Project name must be less than 100 characters')
    .trim(),
});

export const updateProjectSchema = z.object({
  name: z
    .string()
    .min(1, 'Project name is required')
    .max(100, 'Project name must be less than 100 characters')
    .trim()
    .optional(),
});

export const projectIdParamSchema = z.object({
  id: z.string().cuid('Invalid project ID'),
});

// Document validation schemas
export const documentFileTypeSchema = z.enum(['pdf', 'txt', 'md']);

export const documentStatusSchema = z.enum(['uploading', 'processing', 'completed', 'failed']);

export const documentUploadSchema = z.object({
  file: z
    .instanceof(File)
    .refine((file) => file.size <= 10 * 1024 * 1024, {
      message: 'File must be less than 10MB',
    })
    .refine(
      (file) => {
        const validTypes = ['application/pdf', 'text/plain', 'text/markdown'];
        return validTypes.includes(file.type) || file.name.match(/\.(pdf|txt|md)$/i);
      },
      {
        message: 'File must be PDF, TXT, or MD',
      }
    ),
});

export const documentIdParamSchema = z.object({
  documentId: z.string().cuid('Invalid document ID'),
});

// Conversation validation schemas
export const createConversationSchema = z.object({
  projectId: z.string().cuid('Invalid project ID'),
  sessionId: z.string().min(1, 'Session ID is required'),
});

export const addConversationTurnSchema = z.object({
  userQuery: z.string().min(1, 'User query is required'),
  agentResponse: z.string().min(1, 'Agent response is required'),
});

export const conversationIdParamSchema = z.object({
  id: z.string().cuid('Invalid conversation ID'),
});

// Widget token validation
export const validateTokenSchema = z.object({
  token: z.string().length(64, 'Invalid token format'),
});

// Environment variable validation (for API server)
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().url('Invalid database URL'),
  JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  OPENAI_API_KEY: z.string().startsWith('sk-', 'Invalid OpenAI API key'),
  ALLOWED_ORIGINS: z.string().transform((val) => val.split(',')),
});

// Type inference helpers
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type AddConversationTurnInput = z.infer<typeof addConversationTurnSchema>;
export type Env = z.infer<typeof envSchema>;
