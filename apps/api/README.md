# Vakkya API Server

Fastify-based REST API for Vakkya voice agent platform.

## Tech Stack

- **Fastify** - HTTP server
- **Prisma** - Database ORM with PostgreSQL + pgvector
- **Zod** - Schema validation
- **Pino** - Structured logging
- **JWT** - Authentication
- **OpenAI** - Text embeddings for RAG

## Setup

### 1. Install Dependencies

```bash
pnpm install
```

This will automatically run `prisma generate` via postinstall hook.

### 2. Configure Environment

Copy `.env.example` to `.env` and update values:

```bash
cp .env.example .env
```

Required variables:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT signing (min 32 chars)
- `OPENAI_API_KEY` - OpenAI API key for embeddings

### 3. Set Up Database

**Option A: Railway (Recommended for Production)**

1. Create PostgreSQL database in Railway
2. Copy `DATABASE_URL` from Railway dashboard
3. Update `.env` with the connection string
4. Run migrations: `npm run db:migrate`

**Option B: Local PostgreSQL**

1. Install PostgreSQL 17+ with pgvector extension
2. Create database: `createdb vakkya`
3. Update `DATABASE_URL` in `.env`
4. Run migrations: `npm run db:migrate`

### 4. Verify Setup

```bash
npm run db:verify
```

This checks that:
- Prisma schema is valid
- All models are present
- pgvector extension is configured
- Prisma Client is generated
- Migration files exist

### 5. Start Development Server

```bash
npm run dev
```

Server will start on `http://localhost:3000`

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run lint` - Lint code
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Prisma Studio (database GUI)
- `npm run db:verify` - Verify Prisma setup

## Database

### Models

- **User** - Authentication and project ownership
- **Project** - User projects with widget tokens
- **Document** - Uploaded documents (PDF, TXT, MD)
- **DocumentChunk** - Text chunks with vector embeddings (pgvector)
- **Conversation** - Voice conversation sessions
- **ConversationTurn** - Individual turns in conversations

### pgvector

The `document_chunks` table uses pgvector for storing 1536-dimensional embeddings from OpenAI's `text-embedding-3-small` model. This enables semantic search for RAG (Retrieval-Augmented Generation).

See `prisma/README.md` for detailed database documentation.

## API Endpoints

### Health Checks

- `GET /health` - Basic health check
- `GET /health/ready` - Database + pgvector readiness check

### Authentication (Coming Soon)

- `POST /auth/signup` - Create user account
- `POST /auth/login` - Login and get JWT token

### Projects (Coming Soon)

- `POST /projects` - Create project
- `GET /projects` - List user's projects
- `GET /projects/:id` - Get project details
- `PATCH /projects/:id` - Update project
- `DELETE /projects/:id` - Delete project

### Documents (Coming Soon)

- `POST /projects/:projectId/documents` - Upload document
- `GET /projects/:projectId/documents` - List documents
- `GET /projects/:projectId/documents/:id` - Get document details
- `DELETE /projects/:projectId/documents/:id` - Delete document

### Conversations (Coming Soon)

- `GET /projects/:projectId/conversations` - List conversations
- `GET /conversations/:id` - Get conversation details
- `POST /conversations` - Create conversation (voice agent)
- `POST /conversations/:id/turns` - Add turn (voice agent)

## Deployment

See `DEPLOYMENT.md` for Railway deployment instructions.
