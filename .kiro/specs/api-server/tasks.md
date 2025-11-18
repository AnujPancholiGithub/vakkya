# Implementation Plan - API Server (Simplified MVP)

- [x] 1. Set up project structure and core dependencies
  - Initialize Fastify app with TypeScript configuration
  - Install core dependencies: Fastify, Prisma, Zod, Pino, Helmet
  - Configure environment variable validation with Zod
  - Set up Pino structured logging
  - _Requirements: All_

- [x] 2. Set up database and Prisma with pgvector
  - Create Prisma schema with User, Project, Document, DocumentChunk, Conversation, ConversationTurn models
  - Add pgvector extension for vector storage
  - Configure PostgreSQL connection with Railway
  - Generate Prisma client
  - Create initial migration
  - _Requirements: 1.1, 2.1, 3.2, 5.1_

- [x] 3. Implement simple JWT authentication
- [x] 3.1 Create JWT authentication middleware
  - Install jsonwebtoken library
  - Create sign/verify utility functions
  - Extract and verify JWT from Authorization header
  - Create or fetch user record from database
  - Attach user to request context
  - Return 401 for invalid/expired tokens
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 3.2 Create auth routes
  - POST /auth/signup - Create user and return JWT
  - POST /auth/login - Verify credentials and return JWT
  - _Requirements: 1.1_

- [x] 3.3 Write basic tests for authentication
  - Test JWT sign and verify
  - Test invalid token rejection
  - _Requirements: 1.2, 1.3_

- [x] 4. Implement project service
- [x] 4.1 Create project service with CRUD operations
  - Implement create with widget token generation (32 bytes hex)
  - Implement list (filter by userId)
  - Implement get (with ownership check)
  - Implement update (with validation)
  - Implement delete (cascade to documents and conversations)
  - Enforce 10 project limit per user
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 4.2 Implement simple token validation
  - Query project by widget token from PostgreSQL
  - Return project configuration
  - Return null for invalid tokens
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 4.3 Write basic tests for project service
  - Test token generation format (64 char hex)
  - Test ownership validation
  - Test project limit enforcement
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 5. Implement project API routes
- [ ] 5.1 Create Zod schemas for project endpoints
  - CreateProjectSchema
  - UpdateProjectSchema
  - ProjectIdParamSchema
  - _Requirements: 10.1_

- [ ] 5.2 Create project routes
  - POST /projects - Create project
  - GET /projects - List user's projects
  - GET /projects/:id - Get project details
  - PATCH /projects/:id - Update project
  - DELETE /projects/:id - Delete project
  - All routes require authentication
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ]* 5.3 Write basic API tests for project routes
  - Test create project endpoint
  - Test authentication requirement
  - Test ownership validation
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Implement document validation utilities
- [ ] 7.1 Create simple file type validation
  - Check file extension for PDF, TXT, MD
  - Validate file size (10MB limit)
  - _Requirements: 3.1, 3.5_

- [ ] 8. Implement RAG processing service with PostgreSQL
- [ ] 8.1 Create document parser
  - Install pdf-parse for PDF parsing
  - Implement PDF parsing
  - Implement MD/TXT parsing (native)
  - Handle parsing errors
  - _Requirements: 4.1_

- [ ] 8.2 Create text chunking service
  - Install LangChain text splitter
  - Configure RecursiveCharacterTextSplitter (1000 chars, 200 overlap)
  - Generate chunks with metadata
  - _Requirements: 4.2_

- [ ] 8.3 Create embedding service
  - Install OpenAI SDK
  - Implement batch embedding generation (100 chunks per call)
  - Use text-embedding-3-small model
  - Validate embedding dimensions (1536)
  - _Requirements: 4.3_

- [ ] 8.4 Create vector storage service using PostgreSQL pgvector
  - Store embeddings in DocumentChunk table with vector column
  - Use projectId for filtering
  - Use documentId + chunkIndex as unique identifier
  - Implement similarity search using pgvector
  - _Requirements: 4.4_

- [ ]* 8.5 Write basic tests for RAG service
  - Test parser for PDF and TXT
  - Test chunking with overlap
  - Test embedding generation
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 9. Implement document service
- [ ] 9.1 Create document service orchestrating upload and processing
  - Implement upload flow: validate → store locally → create record
  - Implement synchronous processing: parse → chunk → embed → store in PostgreSQL
  - Update document status atomically (uploading → processing → completed)
  - Handle failures and update status to 'failed' with error message
  - Implement list, get, delete operations
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

- [ ]* 9.2 Write basic tests for document service
  - Test upload flow
  - Test processing flow
  - Test error handling
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.5, 4.6_

- [ ] 10. Implement document API routes
- [ ] 10.1 Create Zod schemas for document endpoints
  - DocumentIdParamSchema
  - ProjectIdParamSchema
  - _Requirements: 10.1_

- [ ] 10.2 Create document routes
  - POST /projects/:projectId/documents - Upload document
  - GET /projects/:projectId/documents - List documents
  - GET /projects/:projectId/documents/:id - Get document details
  - DELETE /projects/:projectId/documents/:id - Delete document
  - All routes require authentication and ownership check
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ]* 10.3 Write basic API tests for document routes
  - Test upload with multipart form data
  - Test file validation
  - Test processing flow
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 11. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Implement conversation service
- [ ] 12.1 Create simple conversation service
  - Implement create conversation
  - Implement add turn (append to conversation)
  - Implement list (no pagination for MVP)
  - Implement get conversation with all turns
  - _Requirements: 5.1, 5.2, 5.3_

- [ ]* 12.2 Write basic tests for conversation service
  - Test conversation creation
  - Test turn appending
  - Test list and get operations
  - _Requirements: 5.1, 5.2, 5.3_

- [ ] 13. Implement conversation API routes
- [ ] 13.1 Create Zod schemas for conversation endpoints
  - ConversationTurnSchema
  - _Requirements: 10.1_

- [ ] 13.2 Create conversation routes
  - GET /projects/:projectId/conversations - List conversations
  - GET /conversations/:id - Get conversation detail
  - POST /conversations - Create conversation (called by voice agent)
  - POST /conversations/:id/turns - Add turn (called by voice agent)
  - Dashboard routes require authentication, voice agent routes require token validation
  - _Requirements: 5.1, 5.2, 5.3_

- [ ]* 13.3 Write basic API tests for conversation routes
  - Test conversation creation
  - Test turn appending
  - Test list and get operations
  - _Requirements: 5.1, 5.2, 5.3_

- [ ] 14. Implement widget token validation endpoint
- [ ] 14.1 Create token validation route
  - POST /validate-token - Validate widget token and return project config
  - Use project service token validation
  - Return 401 for invalid tokens
  - Include projectId and allowedDomains in response
  - _Requirements: 7.1, 7.2, 7.3_

- [ ]* 14.2 Write basic tests for token validation
  - Test valid token returns config
  - Test invalid token returns 401
  - _Requirements: 7.1, 7.2, 7.3_

- [ ] 15. Implement simple health check endpoint
- [ ] 15.1 Create basic health check route
  - GET /health - Return "ok" with 200 status
  - _Requirements: 9.1_

- [ ] 16. Implement global error handling
- [ ] 16.1 Create error handler middleware
  - Catch all unhandled errors
  - Transform errors into consistent JSON format
  - Log errors with Pino
  - Include request ID for tracing
  - Never expose secrets or internal details
  - _Requirements: 8.4, 8.6_

- [ ] 16.2 Create validation error handler
  - Catch Zod validation errors
  - Transform into 400 Bad Request with field details
  - _Requirements: 8.4, 10.1_

- [ ]* 16.3 Write basic tests for error handlers
  - Test error transformation
  - Test validation error handling
  - _Requirements: 8.4, 8.6_

- [ ] 17. Implement security middleware
- [ ] 17.1 Configure Helmet for security headers
  - Install and configure @fastify/helmet
  - Set appropriate CSP, HSTS, etc.
  - _Requirements: 10.2_

- [ ] 17.2 Configure CORS
  - Install @fastify/cors
  - Whitelist dashboard and widget origins from env vars
  - _Requirements: 10.3_

- [ ]* 17.3 Write basic tests for security
  - Test CORS headers
  - Test security headers
  - _Requirements: 10.2, 10.3_

- [ ] 18. Configure Pino logging
  - Set up structured JSON logging
  - Configure log levels per environment
  - Add request ID to all logs
  - Never log sensitive data
  - _Requirements: 10.6_

- [ ] 19. Create Railway deployment configuration
- [ ] 19.1 Create Dockerfile
  - Use Node.js 24 alpine image
  - Install dependencies
  - Generate Prisma client
  - Expose port 3000
  - _Requirements: All_

- [ ] 19.2 Create database migration script
  - Add migration command to build process
  - Use `prisma migrate deploy`
  - _Requirements: All_

- [ ] 20. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
