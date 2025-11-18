# Requirements Document - API Server

## Introduction

The API Server is a simplified backend service for Vakkya that handles authentication, project management, document processing with inline RAG, and conversation logging. It provides a JSON REST API built with Fastify and TypeScript, using PostgreSQL with pgvector for data persistence and vector storage. This MVP version processes documents synchronously without queues or external vector databases.

## Glossary

- **API Server**: The Fastify-based HTTP service that handles all backend operations
- **Project**: A customer's workspace containing configuration, documents, and conversation logs
- **Widget Token**: A unique 64-character hex token that identifies a project for widget embedding
- **Document**: A file (PDF, TXT, MD) uploaded by a user for RAG knowledge base
- **Document Chunk**: A segment of document text with its embedding stored in PostgreSQL
- **Embedding**: A 1536-dimension vector representation of text using OpenAI text-embedding-3-small
- **pgvector**: PostgreSQL extension for storing and querying vector embeddings
- **Prisma**: TypeScript ORM for database access
- **Railway**: Cloud hosting platform for deployment

## Requirements

### Requirement 1

**User Story:** As a developer, I want to authenticate with the dashboard, so that I can securely manage my projects.

#### Acceptance Criteria

1. WHEN a user signs up THEN the API Server SHALL create a user record with email and password
2. WHEN a user logs in THEN the API Server SHALL verify credentials and return a JWT token
3. IF a JWT token is invalid or expired THEN the API Server SHALL return a 401 Unauthorized response

### Requirement 2

**User Story:** As a developer, I want to create and manage projects, so that I can organize my voice agent deployments.

#### Acceptance Criteria

1. WHEN a user creates a project THEN the API Server SHALL generate a unique 64-character hex widget token and store the project in PostgreSQL
2. WHEN a user requests their projects list THEN the API Server SHALL return all projects owned by that user
3. WHEN a user updates project settings THEN the API Server SHALL validate the input and persist changes to the database
4. WHEN a user deletes a project THEN the API Server SHALL cascade delete all associated documents and conversations
5. THE API Server SHALL enforce a maximum of 10 projects per user

### Requirement 3

**User Story:** As a developer, I want to upload documents to my project, so that the voice agent can answer questions from my knowledge base.

#### Acceptance Criteria

1. WHEN a user uploads a document THEN the API Server SHALL validate the file type is PDF, TXT, or MD
2. WHEN a document is validated THEN the API Server SHALL store it locally and create a document record with status 'uploading'
3. WHEN document processing begins THEN the API Server SHALL update the document status to 'processing'
4. WHEN document processing completes THEN the API Server SHALL update the document status to 'completed'
5. IF document processing fails THEN the API Server SHALL update the document status to 'failed' and store the error message

### Requirement 4

**User Story:** As a developer, I want documents to be automatically processed into searchable knowledge, so that the voice agent can retrieve relevant information.

#### Acceptance Criteria

1. WHEN a document is uploaded THEN the API Server SHALL parse the document content based on file type using pdf-parse for PDF and native parsing for TXT/MD
2. WHEN document content is parsed THEN the API Server SHALL split the text into chunks of 1000 characters with 200 character overlap using LangChain RecursiveCharacterTextSplitter
3. WHEN text chunks are created THEN the API Server SHALL generate embeddings using OpenAI text-embedding-3-small model
4. WHEN embeddings are generated THEN the API Server SHALL store vectors in PostgreSQL DocumentChunk table with pgvector extension
5. WHEN storing vectors THEN the API Server SHALL use projectId for filtering and documentId + chunkIndex as unique identifier
6. WHEN querying vectors THEN the API Server SHALL implement similarity search using pgvector
7. THE API Server SHALL process documents synchronously in the upload request

### Requirement 5

**User Story:** As a developer, I want to retrieve conversation logs, so that I can monitor my voice agent's performance.

#### Acceptance Criteria

1. WHEN the voice agent creates a conversation THEN the API Server SHALL store it in PostgreSQL with projectId and sessionId
2. WHEN the voice agent adds a turn THEN the API Server SHALL append it to the conversation with userQuery and agentResponse
3. WHEN a user requests conversations for a project THEN the API Server SHALL return a list without pagination for MVP

### Requirement 6

**User Story:** As a developer, I want to validate widget tokens, so that only authorized projects can establish voice sessions.

#### Acceptance Criteria

1. WHEN the widget or voice agent validates a token THEN the API Server SHALL query the project by widget token from PostgreSQL
2. IF a widget token is valid THEN the API Server SHALL return project configuration including projectId and allowedDomains
3. IF a widget token is invalid THEN the API Server SHALL return null

### Requirement 7

**User Story:** As a developer, I want the API to handle errors gracefully, so that I can debug issues.

#### Acceptance Criteria

1. WHEN an unexpected error occurs THEN the API Server SHALL log the error with Pino including request ID
2. WHEN an error response is sent THEN the API Server SHALL transform it into consistent JSON format
3. WHEN a Zod validation error occurs THEN the API Server SHALL return 400 Bad Request with field details
4. THE API Server SHALL never expose secrets or internal details in error responses

### Requirement 8

**User Story:** As a system operator, I want health monitoring endpoints, so that Railway can verify the service is running.

#### Acceptance Criteria

1. THE API Server SHALL expose a GET /health endpoint that returns 200 OK with "ok" status

### Requirement 9

**User Story:** As a security-conscious developer, I want all API requests to be validated and secured, so that my data is protected.

#### Acceptance Criteria

1. THE API Server SHALL validate all request bodies using Zod schemas before processing
2. THE API Server SHALL set security headers using Helmet middleware
3. THE API Server SHALL configure CORS to allow only dashboard and widget origins from environment variables

### Requirement 10

**User Story:** As a developer, I want structured logging, so that I can debug issues in production.

#### Acceptance Criteria

1. THE API Server SHALL use Pino for structured JSON logging
2. THE API Server SHALL configure log levels per environment (debug for dev, info for production)
3. THE API Server SHALL add request ID to all logs for tracing
4. THE API Server SHALL never log sensitive data including tokens or API keys
