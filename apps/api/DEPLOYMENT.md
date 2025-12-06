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
ALLOWED_ORIGINS=https://www.vakkya.com
```

### Step 4: Configure Build Settings

Railway supports two deployment methods:

#### Option A: Docker Deployment (Recommended)

Railway will automatically detect the `Dockerfile` and use it for deployment.

**Advantages:**
- Consistent build environment
- Optimized multi-stage build
- Built-in health checks
- Smaller production image

**Configuration:**
- Railway will automatically use the Dockerfile
- No build/start commands needed
- Ensure environment variables are set (Step 3)

#### Option B: Node.js Deployment

If you prefer not to use Docker:

**Build Command:**
```bash
pnpm install && pnpm run db:migrate && pnpm run build
```

**Start Command:**
```bash
pnpm start
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

## Docker Deployment

### Building Locally

```bash
# Build the Docker image
docker build -t vakkya-api -f apps/api/Dockerfile .

# Run the container
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e JWT_SECRET="your-secret" \
  -e OPENAI_API_KEY="sk-..." \
  -e ALLOWED_ORIGINS="https://www.vakkya.com" \
  vakkya-api
```

### Multi-Stage Build

The Dockerfile uses a multi-stage build:
1. **Builder stage**: Installs all dependencies, generates Prisma client, builds TypeScript
2. **Production stage**: Copies only production dependencies and built files

This results in a smaller, more secure production image.

### Health Check

The Docker image includes a built-in health check that runs every 30 seconds:
```bash
docker ps  # Check HEALTH status
```

## Local Development with Railway Database

You can connect to Railway's PostgreSQL from your local machine:

1. Get the `DATABASE_URL` from Railway dashboard
2. Update your local `.env` file
3. Run migrations: `pnpm run db:migrate`
4. Start dev server: `pnpm run dev`

## Database Migrations

### Development
```bash
# Create a new migration
npx prisma migrate dev --name <migration_name>
```

### Production (Railway)

#### Automatic Migration (Docker)
When using Docker deployment, migrations are handled during the build process.

#### Manual Migration
```bash
# Deploy pending migrations only
pnpm run db:migrate

# Deploy migrations + verify pgvector
pnpm run db:migrate:full
```

The `db:migrate:full` script:
1. Checks DATABASE_URL is configured
2. Runs `prisma migrate deploy`
3. Verifies pgvector extension is enabled

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
