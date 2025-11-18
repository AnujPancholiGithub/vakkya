/**
 * Shared TypeScript types for Vakkya
 * Used across API, Dashboard, and Voice Agent
 */

// User types
export interface User {
  id: string;
  email: string;
  createdAt: Date;
}

// Project types
export interface Project {
  id: string;
  userId: string;
  name: string;
  widgetToken: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectConfig {
  projectId: string;
  allowedDomains?: string[];
}

// Document types
export type DocumentStatus = 'uploading' | 'processing' | 'completed' | 'failed';

export type DocumentFileType = 'pdf' | 'txt' | 'md';

export interface Document {
  id: string;
  projectId: string;
  filename: string;
  fileType: DocumentFileType;
  status: DocumentStatus;
  errorMessage?: string;
  createdAt: Date;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  projectId: string;
  chunkIndex: number;
  text: string;
  embedding?: number[];
}

// Conversation types
export interface Conversation {
  id: string;
  projectId: string;
  sessionId: string;
  startedAt: Date;
  turnCount: number;
}

export interface ConversationTurn {
  id: string;
  conversationId: string;
  userQuery: string;
  agentResponse: string;
  timestamp: Date;
}

export interface ConversationDetail extends Conversation {
  turns: ConversationTurn[];
}

// API Response types (inputs are inferred from validation schemas)
export interface AuthResponse {
  token: string;
  user: User;
}

export interface ValidateTokenResponse {
  projectId: string;
  allowedDomains?: string[];
}

// Error types
export interface ApiError {
  code: string;
  message: string;
  requestId?: string;
}

export interface ApiErrorResponse {
  error: ApiError;
}
