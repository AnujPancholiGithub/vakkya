/**
 * Shared constants for Vakkya
 */

// File upload limits
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ALLOWED_FILE_TYPES = ['pdf', 'txt', 'md'] as const;
export const ALLOWED_MIME_TYPES = ['application/pdf', 'text/plain', 'text/markdown'] as const;

// Project limits
export const MAX_PROJECTS_PER_USER = 10;
export const MAX_PROJECT_NAME_LENGTH = 100;

// Document processing
export const CHUNK_SIZE = 1000;
export const CHUNK_OVERLAP = 200;
export const EMBEDDING_DIMENSIONS = 1536;
export const EMBEDDING_MODEL = 'text-embedding-3-small';

// RAG settings
export const DEFAULT_TOP_K = 5;
export const MAX_CONTEXT_LENGTH = 4000;

// Authentication
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 100;
export const JWT_EXPIRES_IN = '7d';

// API settings
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// Status values
export const DOCUMENT_STATUSES = ['uploading', 'processing', 'completed', 'failed'] as const;

// Error codes
export const ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  PROJECT_LIMIT_REACHED: 'PROJECT_LIMIT_REACHED',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  PROCESSING_FAILED: 'PROCESSING_FAILED',
} as const;
