# Prisma Database Setup

## Prerequisites

1. PostgreSQL 17+ with pgvector extension
2. Database connection string in `.env` file

## Initial Setup

### 1. Enable pgvector Extension

If using Railway or a managed PostgreSQL service, the pgvector extension should be available. The migration will automatically enable it.

### 2. Run Migrations

```bash
# Development (with local database)
npx prisma migrate dev

# Production (Railway)
npx prisma migrate deploy
```

### 3. Generate Prisma Client

```bash
npx prisma generate
```

This is automatically run after `npm install` via the `postinstall` script.

## Database Schema

### Models

- **User**: Authentication and project ownership
- **Project**: User projects with widget tokens
- **Document**: Uploaded documents (PDF, TXT, MD)
- **DocumentChunk**: Text chunks with vector embeddings (pgvector)
- **Conversation**: Voice conversation sessions
- **ConversationTurn**: Individual turns in conversations

### Key Features

- **pgvector**: Stores 1536-dimensional embeddings for RAG
- **Cascade Deletes**: Deleting a project removes all documents and conversations
- **Indexes**: Optimized for common queries (userId, projectId, widgetToken)

## Development Commands

```bash
# Open Prisma Studio (database GUI)
npx prisma studio

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Create a new migration
npx prisma migrate dev --name <migration_name>

# Format schema file
npx prisma format
```

## Production Deployment

The migration is automatically run during Railway deployment via the build command:

```bash
npx prisma migrate deploy && npm run build
```

## Vector Search

The `document_chunks` table uses pgvector for similarity search:

```sql
-- Example vector similarity query
SELECT * FROM document_chunks
WHERE projectId = 'xxx'
ORDER BY embedding <-> '[0.1, 0.2, ...]'::vector
LIMIT 5;
```

The `<->` operator performs cosine distance calculation for finding similar embeddings.
