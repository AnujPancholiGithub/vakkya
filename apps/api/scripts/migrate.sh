#!/bin/bash
set -e

echo "🔄 Starting database migration..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL environment variable is not set"
  exit 1
fi

echo "✅ DATABASE_URL is configured"

# Run Prisma migrations
echo "📦 Running Prisma migrations..."
npx prisma migrate deploy

echo "✅ Database migrations completed successfully"

# Verify pgvector extension
echo "🔍 Verifying pgvector extension..."
npx prisma db execute --stdin <<SQL
CREATE EXTENSION IF NOT EXISTS vector;
SQL

echo "✅ pgvector extension verified"

echo "🎉 Migration script completed successfully"
