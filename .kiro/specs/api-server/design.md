# Design Document - API Server (Simplified MVP)

## Overview

The API Server is a minimal Fastify-based TypeScript service that provides REST APIs for authentication, project management, document upload with inline RAG processing, and conversation logging. This MVP version uses PostgreSQL with pgvector for vector storage, simple JWT authentication, and synchronous document processing.

**Key Design Goals:**
- Minimal viable implementation - no external services beyond PostgreSQL and OpenAI
- Synchronous document processing (blocking upload request)
- PostgreSQL pgvector for vector embeddings (no Pinecone)
- Simple JWT authentication (no Clerk)
- Local file storage (no S3)
- No caching, no queues, no circuit breakers for MVP

## Architecture

### High-Level Architecture

```
┌─────────────┐         ┌─────────────┐
│  Dashboard  │────────▶│  API Server │
│  (Next.js)  │         │  (Fastify)  │
└─────────────┘         └──────┬──────┘
                               │
┌─────────────┐                │
│Voice Agent  │────────────────┘
│  (Python)   │
└─────────────┘

API Server Dependencies:
├── PostgreSQL (Railway) - Data + pgvector
└── OpenAI - Text embeddings
```

### Request Flow

**Document Upload (Synchronous):**
```
1. User uploads file via dashboard
2. Validate file type and size
3. Store file locally
4. Parse document (pdf-parse or native)
5. Split into chunks (LangChain)
6. Generate embeddings (OpenAI)
7. Store in PostgreSQL with pgvector
8. Return success
```

## Components and Interfaces

### 1. Authentication Middleware

**Purpose:** Verify JWT tokens and attach user to request.

**Interface:**
```typescript
interface AuthMiddleware {
  verifyToken(request: FastifyRequest): Promise<User>;
}

interface User {
  id: string;
  email: string;
}
```

### 2. Project Service

**Purpose:** Manage project CRUD operations.

**Interface:**
```typescript
interface ProjectService {
  create(userId: string, name: string): Promise<Project>;
  list(userId: string): Promise<Project[]>;
  get(userId: string, projectId: string): Promise<Project>;
  update(userId: string, projectId: string, data: UpdateProjectInput): Promise<Project>;
  delete(userId: string, projectId: string): Promise<void>;
  validateToken(token: string): Promise<ProjectConfig | null>;
}

interface Project {
  id: string;
  userId: string;
  name: string;
  widgetToken: string; // 64-char hex
  createdAt: Date;
  updatedAt: Date;
}
```

**Behavior:**
- Generate 32-byte hex tokens (64 characters)
- Enforce 10 project limit per user
- Cascade delete documents and conversations

### 3. Document Service

**Purpose:** Handle document uploads and synchronous RAG processing.

**Interface:**
```typescript
interface DocumentService {
  upload(projectId: string, file: MultipartFile): Promise<Document>;
  list(projectId: string): Promise<Document[]>;
  get(projectId: string, documentId: string): Promise<Document>;
  delete(projectId: string, documentId: string): Promise<void>;
}

interface Document {
  id: string;
  projectId: string;
  filename: string;
  fileType: 'pdf' | 'txt' | 'md';
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  errorMessage?: string;
  createdAt: Date;
}
```

**Behavior:**
- Validate file type (PDF, TXT, MD only)
- Enforce 10MB file size limit
- Process synchronously in upload request
- Store locally (no S3)

### 4. RAG Processing Service

**Purpose:** Parse, chunk, embed, and store documents.

**Interface:**
```typescript
interface RAGService {
  parseDocument(filePath: string, fileType: string): Promise<string>;
  splitText(content: string): Promise<TextChunk[]>;
  generateEmbeddings(chunks: TextChunk[]): Promise<EmbeddedChunk[]>;
  storeVectors(projectId: string, documentId: string, chunks: EmbeddedChunk[]): Promise<void>;
  queryVectors(projectId: string, queryText: string, topK: number): Promise<DocumentChunk[]>;
}

interface TextChunk {
  text: string;
  index: number;
}

interface EmbeddedChunk extends TextChunk {
  embedding: number[]; // 1536 dimensions
}
```

**Behavior:**
- Parse PDF using `pdf-parse`, TXT/MD natively
- Split using LangChain RecursiveCharacterTextSplitter (1000 chars, 200 overlap)
- Batch embeddings (100 chunks per OpenAI call)
- Store in PostgreSQL DocumentChunk table with pgvector
- Query using pgvector similarity search

### 5. Conversation Service

**Purpose:** Store and retrieve conversation logs.

**Interface:**
```typescript
interface ConversationService {
  create(projectId: string, sessionId: string): Promise<Conversation>;
  addTurn(conversationId: string, turn: ConversationTurn): Promise<void>;
  list(projectId: string): Promise<Conversation[]>;
  get(conversationId: string): Promise<ConversationDetail>;
}

interface Conversation {
  id: string;
  projectId: string;
  sessionId: string;
  startedAt: Date;
  turnCount: number;
}

interface ConversationTurn {
  userQuery: string;
  agentResponse: string;
  timestamp: Date;
}
```

## Data Models

### Prisma Schema

```prisma
model User {
  id        String    @id @default(cuid())
  email     String    @unique
  password  String    // Hashed
  createdAt DateTime  @default(now())
  projects  Project[]
}

model Project {
  id           String         @id @default(cuid())
  userId       String
  name         String
  widgetToken  String         @unique
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt
  user         User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  documents    Document[]
  conversations Conversation[]

  @@index([userId])
  @@index([widgetToken])
}

model Document {
  id           String          @id @default(cuid())
  projectId    String
  filename     String
  fileType     String
  status       String          @default("uploading")
  errorMessage String?
  createdAt    DateTime        @default(now())
  project      Project         @relation(fields: [projectId], references: [id], onDelete: Cascade)
  chunks       DocumentChunk[]

  @@index([projectId])
}

model DocumentChunk {
  id         String                 @id @default(cuid())
  documentId String
  projectId  String
  chunkIndex Int
  text       String                 @db.Text
  embedding  Unsupported("vector")? // pgvector type
  document   Document               @relation(fields: [documentId], references: [id], onDelete: Cascade)

  @@unique([documentId, chunkIndex])
  @@index([projectId])
}

model Conversation {
  id        String             @id @default(cuid())
  projectId String
  sessionId String
  startedAt DateTime           @default(now())
  turnCount Int                @default(0)
  project   Project            @relation(fields: [projectId], references: [id], onDelete: Cascade)
  turns     ConversationTurn[]

  @@index([projectId])
}

model ConversationTurn {
  id             String       @id @default(cuid())
  conversationId String
  userQuery      String       @db.Text
  agentResponse  String       @db.Text
  timestamp      DateTime     @default(now())
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)

  @@index([conversationId])
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system.*

### Property 1: JWT validation rejects invalid tokens
*For any* expired or malformed JWT token, the authentication middleware should return 401 Unauthorized.
**Validates: Requirements 1.3**

### Property 2: Project limit enforcement
*For any* user with 10 existing projects, attempting to create another should fail.
**Validates: Requirements 2.5**

### Property 3: Widget token uniqueness
*For any* two different projects, their widget tokens should be unique.
**Validates: Requirements 2.1**

### Property 4: Cascade deletion
*For any* deleted project, all associated documents and conversations should also be removed.
**Validates: Requirements 2.4**

### Property 5: File type validation
*For any* uploaded file not matching PDF, TXT, or MD, the upload should be rejected.
**Validates: Requirements 3.1**

### Property 6: Document status transitions
*For any* document, status should only transition: uploading → processing → completed, or uploading/processing → failed.
**Validates: Requirements 3.3, 3.4, 3.5**

### Property 7: Embedding dimension consistency
*For any* text chunk, the embedding should have exactly 1536 dimensions.
**Validates: Requirements 4.3**

### Property 8: Vector storage with projectId
*For any* stored document chunk, it should include projectId for filtering.
**Validates: Requirements 4.5**

### Property 9: Conversation turn appending
*For any* conversation, adding a turn should increment turnCount and store the turn.
**Validates: Requirements 5.2**

### Property 10: Token validation returns config
*For any* valid widget token, validation should return projectId and allowedDomains.
**Validates: Requirements 6.2**

## Error Handling

### Error Categories

**Validation Errors (400):**
- Invalid request body
- File type not supported
- File size exceeds limit

**Authentication Errors (401):**
- Missing JWT token
- Invalid JWT signature
- Expired JWT token

**Internal Errors (500):**
- Database errors
- File system errors
- OpenAI API errors

### Error Response Format

```typescript
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    requestId: string;
  };
}
```

## Testing Strategy

### Unit Testing

**Framework:** Vitest

**Coverage:**
- Service layer business logic
- Validation schemas
- Token generation
- Error handling

### Property-Based Testing

**Framework:** fast-check

**Configuration:** Minimum 100 iterations per test

**Tests:**
- Property 2: Project limit enforcement
- Property 3: Widget token uniqueness
- Property 6: Document status transitions
- Property 7: Embedding dimensions

## Deployment

### Environment Variables

```bash
DATABASE_URL=postgresql://...
JWT_SECRET=...
OPENAI_API_KEY=...
ALLOWED_ORIGINS=https://www.vakkya.com
PORT=3000
NODE_ENV=production
```

### Railway Configuration

**Dockerfile:**
```dockerfile
FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npx prisma generate
EXPOSE 3000
CMD ["npm", "start"]
```

### Database Migrations

- Use Prisma Migrate: `npx prisma migrate deploy`
- Run before deployment in Railway build command

## Performance Considerations

### Latency Targets

- Health check: <50ms
- Token validation: <100ms
- Project list: <200ms
- Document upload: <30 seconds (blocking)

### Optimization

- Index on frequently queried fields
- Connection pooling (max 10 connections)
- Batch OpenAI embedding requests

## Security

- JWT tokens for authentication
- Zod validation on all inputs
- Helmet for security headers
- CORS whitelist from env vars
- Never log secrets
