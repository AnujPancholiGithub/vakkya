# API Server Deployment Guide

## Railway Deployment

### Prerequisites

1. Railway account
2. GitHub repository connected to Railway
3. PostgreSQL database provisioned in Railway

### Step 1: Create PostgreSQL Database

1. In Railway dashboard, click "New" → "Database" → "PostgreSQL"
2. Railway will automatically provision PostgreSQL 17
3. Copy the `DATABASE_URL` connection string

### Step 2: Enable pgvector Extension

Railway's PostgreSQL includes pgvector by default. The migration will automatically enable it.

To verify manually:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Step 3: Configure Environment Variables

In Railway project settings, add these environment variables:

```bash
NODE_ENV=production
PORT=3000
DATABASE_URL=${{Postgres.DATABASE_URL}}  # Auto-linked from Railway
JWT_SECRET=<generate-secure-random-string-min-32-chars>
JWT_EXPIRES_IN=7d
OPENAI_API_KEY=<your-openai-api-key>
ALLOWED_ORIGINS=https://dashboard.vakkya.ai,https://widget.vakkya.ai
```

### Step 4: Configure Build Settings

**Build Command:**
```bash
npm install && npx prisma migrate deploy && npm run build
```

**Start Command:**
```bash
npm start
```

### Step 5: Deploy

1. Push code to GitHub
2. Railway will automatically build and deploy
3. Check deployment logs for any errors
4. Verify health endpoint: `https://your-app.railway.app/health/ready`

### Expected Response

```json
{
  "status": "ready",
  "database": "connected",
  "pgvector": "enabled"
}
```

## Local Development with Railway Database

You can connect to Railway's PostgreSQL from your local machine:

1. Get the `DATABASE_URL` from Railway dashboard
2. Update your local `.env` file
3. Run migrations: `npm run db:migrate`
4. Start dev server: `npm run dev`

## Database Migrations

### Development
```bash
# Create a new migration
npx prisma migrate dev --name <migration_name>
```

### Production (Railway)
```bash
# Deploy pending migrations
npx prisma migrate deploy
```

This is automatically run during Railway build.

## Troubleshooting

### Migration Fails

**Error:** `P1001: Can't reach database server`

**Solution:** Verify `DATABASE_URL` is correct and database is running.

### pgvector Not Enabled

**Error:** `type "vector" does not exist`

**Solution:** Run manually in Railway's PostgreSQL console:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Connection Pool Exhausted

**Error:** `P2024: Timed out fetching a new connection`

**Solution:** Increase connection pool size in `DATABASE_URL`:
```
postgresql://user:pass@host:5432/db?connection_limit=10
```

## Monitoring

Check application health:
- `/health` - Basic health check
- `/health/ready` - Database + pgvector check

Monitor Railway metrics:
- CPU usage
- Memory usage
- Database connections
- Request latency
