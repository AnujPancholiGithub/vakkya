# Database Schema Reference

**CRITICAL:** The voice agent uses the existing PostgreSQL schema from the API server.

## Schema Location
- **Prisma Schema:** `apps/api/prisma/schema.prisma`
- **Migration SQL:** `apps/api/prisma/migrations/20241118000000_init/migration.sql`

## Important Notes

### Column Naming Convention
Prisma generates **camelCase** column names in PostgreSQL (NOT snake_case).

Always use quoted identifiers in SQL queries:
```sql
SELECT "id", "projectId", "sessionId" FROM conversations
```

### Tables Used by Voice Agent

#### conversations
```sql
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,  -- Stores LiveKit room name
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "turnCount" INTEGER NOT NULL DEFAULT 0
);
```

#### conversation_turns
```sql
CREATE TABLE "conversation_turns" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "userQuery" TEXT NOT NULL,
    "agentResponse" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

## Field Mappings

| Python Model | PostgreSQL Column | Type | Notes |
|--------------|-------------------|------|-------|
| session.session_id | conversations."id" | TEXT | Primary key |
| session.project_id | conversations."projectId" | TEXT | Foreign key to projects |
| session.room_name | conversations."sessionId" | TEXT | LiveKit room name |
| session.created_at | conversations."startedAt" | TIMESTAMP | Auto-generated |
| turn.turn_id | conversation_turns."id" | TEXT | Primary key |
| turn.session_id | conversation_turns."conversationId" | TEXT | Foreign key to conversations |
| turn.user_query | conversation_turns."userQuery" | TEXT | User's question |
| turn.agent_response | conversation_turns."agentResponse" | TEXT | Agent's answer |
| turn.timestamp | conversation_turns."timestamp" | TIMESTAMP | Auto-generated |

## Not Stored in MVP Schema

The following fields exist in Python models but are NOT persisted to the database:
- `session.page_context` - Will be added in task 7 (data channel handling)
- `session.status` - Not needed for MVP
- `turn.rag_documents` - Not stored (only used in-memory during processing)

## Before Making Schema Changes

1. **Check Prisma schema first:** `apps/api/prisma/schema.prisma`
2. **Verify column names in migration:** `apps/api/prisma/migrations/*/migration.sql`
3. **Use quoted identifiers:** Always quote camelCase column names
4. **Update this document:** Keep this reference up-to-date

## Common Mistakes to Avoid

❌ **WRONG:**
```sql
SELECT id, project_id, session_id FROM conversations
```

✅ **CORRECT:**
```sql
SELECT "id", "projectId", "sessionId" FROM conversations
```

❌ **WRONG:**
```sql
INSERT INTO voice_sessions (session_id, project_id, ...)
```

✅ **CORRECT:**
```sql
INSERT INTO conversations ("id", "projectId", "sessionId", ...)
```
