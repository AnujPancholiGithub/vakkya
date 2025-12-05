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

// Form field validation schemas
export const formFieldTypeSchema = z.enum(['string', 'email', 'phone', 'number', 'enum', 'text']);

export const formFieldSchema = z.object({
  name: z
    .string()
    .min(1, 'Field name is required')
    .max(100, 'Field name must be less than 100 characters'),
  type: formFieldTypeSchema,
  label: z
    .string()
    .min(1, 'Field label is required')
    .max(200, 'Field label must be less than 200 characters'),
  required: z.boolean().default(true),
  options: z.array(z.string().min(1, 'Option cannot be empty')).optional(),
}).superRefine((data, ctx) => {
  if (data.type === 'enum' && (!data.options || data.options.length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Options are required for enum fields',
      path: ['options'],
    });
  }
});

export const createFormSchemaSchema = z.object({
  name: z
    .string()
    .min(1, 'Form name is required')
    .max(100, 'Form name must be less than 100 characters'),
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .optional()
    .or(z.literal('')),
  fields: z
    .array(formFieldSchema)
    .min(1, 'At least one field is required')
    .max(50, 'Maximum 50 fields allowed'),
  triggerPhrases: z
    .array(z.string().min(1, 'Trigger phrase cannot be empty').max(100))
    .max(20, 'Maximum 20 trigger phrases allowed')
    .optional(),
  greetingMessage: z
    .string()
    .max(500, 'Greeting message must be less than 500 characters')
    .optional()
    .or(z.literal('')),
  completionMessage: z
    .string()
    .max(500, 'Completion message must be less than 500 characters')
    .optional()
    .or(z.literal('')),
  webhookUrl: z
    .string()
    .url('Invalid webhook URL')
    .optional()
    .or(z.literal('')),
  webhookSecret: z
    .string()
    .max(100, 'Webhook secret must be less than 100 characters')
    .optional()
    .or(z.literal('')),
  isActive: z.boolean().optional(),
});

export const updateFormSchemaSchema = z.object({
  name: z
    .string()
    .min(1, 'Form name is required')
    .max(100, 'Form name must be less than 100 characters')
    .optional(),
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .optional()
    .or(z.literal('')),
  fields: z
    .array(formFieldSchema)
    .min(1, 'At least one field is required')
    .max(50, 'Maximum 50 fields allowed')
    .optional(),
  triggerPhrases: z
    .array(z.string().min(1, 'Trigger phrase cannot be empty').max(100))
    .max(20, 'Maximum 20 trigger phrases allowed')
    .optional(),
  greetingMessage: z
    .string()
    .max(500, 'Greeting message must be less than 500 characters')
    .optional()
    .or(z.literal('')),
  completionMessage: z
    .string()
    .max(500, 'Completion message must be less than 500 characters')
    .optional()
    .or(z.literal('')),
  webhookUrl: z
    .string()
    .url('Invalid webhook URL')
    .optional()
    .or(z.literal('')),
  webhookSecret: z
    .string()
    .max(100, 'Webhook secret must be less than 100 characters')
    .optional()
    .or(z.literal('')),
  isActive: z.boolean().optional(),
});

export const formSubmissionSchema = z.object({
  data: z.record(z.any()).refine(
    (data) => Object.keys(data).length > 0,
    { message: 'Submission data cannot be empty' }
  ),
  conversationId: z.string().cuid('Invalid conversation ID').optional(),
});

export const formSubmissionStatusSchema = z.enum(['pending', 'completed', 'failed']);

export const formEventTypeSchema = z.enum(['activated', 'field_collected', 'submitted', 'abandoned']);

export const createFormEventSchema = z.object({
  formSchemaId: z.string().cuid('Invalid form schema ID'),
  conversationId: z.string().cuid('Invalid conversation ID').optional(),
  sessionId: z.string().min(1, 'Session ID is required'),
  eventType: formEventTypeSchema,
  fieldName: z.string().max(100).optional(),
  fieldValue: z.string().optional(),
  attemptCount: z.number().int().min(1).optional(),
  metadata: z.record(z.any()).optional(),
});

export const formIdParamSchema = z.object({
  formId: z.string().cuid('Invalid form ID'),
});

// Environment variable validation (for API server)
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().url('Invalid database URL'),
  JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  OPENAI_API_KEY: z.string().min(1, 'OpenAI API key is required'),
  OPENAI_BASE_URL: z.string().url().optional(),
  LIVEKIT_URL: z.string().startsWith('wss://', 'LiveKit URL must start with wss://'),
  LIVEKIT_API_KEY: z.string().min(1, 'LiveKit API key is required'),
  LIVEKIT_API_SECRET: z.string().min(1, 'LiveKit API secret is required'),
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
export type FormFieldType = z.infer<typeof formFieldTypeSchema>;
export type FormField = z.infer<typeof formFieldSchema>;
export type CreateFormSchemaInput = z.infer<typeof createFormSchemaSchema>;
export type UpdateFormSchemaInput = z.infer<typeof updateFormSchemaSchema>;
export type FormSubmissionInput = z.infer<typeof formSubmissionSchema>;
export type FormSubmissionStatus = z.infer<typeof formSubmissionStatusSchema>;
export type FormEventType = z.infer<typeof formEventTypeSchema>;
export type CreateFormEventInput = z.infer<typeof createFormEventSchema>;
