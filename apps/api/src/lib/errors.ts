/**
 * Custom error classes for the API
 */

/**
 * Error thrown when a document is not found
 */
export class DocumentNotFoundError extends Error {
  constructor(message: string = 'Document not found') {
    super(message);
    this.name = 'DocumentNotFoundError';
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DocumentNotFoundError);
    }
  }
}

/**
 * Error thrown when a project is not found
 */
export class ProjectNotFoundError extends Error {
  constructor(message: string = 'Project not found') {
    super(message);
    this.name = 'ProjectNotFoundError';
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ProjectNotFoundError);
    }
  }
}
