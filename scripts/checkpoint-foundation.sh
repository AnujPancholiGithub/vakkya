#!/bin/bash

# Checkpoint 0.6: Validate Foundation
# Verifies that all foundation tasks are complete and working

set -e

echo "🔍 Running Foundation Checkpoint..."
echo ""

# Check 1: Prisma setup
echo "1️⃣  Verifying Prisma setup..."
cd apps/api
npm run db:verify
cd ../..
echo ""

# Check 2: Shared schemas package
echo "2️⃣  Verifying shared schemas package..."
cd apps/api
npx tsx scripts/verify-schemas.ts
cd ../..
echo ""

# Check 3: Environment files
echo "3️⃣  Verifying .env.example files..."
if [ -f "apps/api/.env.example" ]; then
  echo "✅ apps/api/.env.example exists"
  
  # Check for required variables
  required_vars=("NODE_ENV" "PORT" "DATABASE_URL" "JWT_SECRET" "JWT_EXPIRES_IN" "OPENAI_API_KEY" "ALLOWED_ORIGINS")
  for var in "${required_vars[@]}"; do
    if grep -q "$var" apps/api/.env.example; then
      echo "   ✅ $var present"
    else
      echo "   ❌ $var missing"
      exit 1
    fi
  done
  
  # Check for deprecated variables
  deprecated_vars=("REDIS_URL" "CLERK_SECRET_KEY" "PINECONE_API_KEY" "AWS_ACCESS_KEY_ID" "SENTRY_DSN")
  for var in "${deprecated_vars[@]}"; do
    if grep -q "$var" apps/api/.env.example; then
      echo "   ⚠️  Deprecated variable found: $var"
      exit 1
    fi
  done
  
  echo "✅ No deprecated variables found"
else
  echo "❌ apps/api/.env.example not found"
  exit 1
fi
echo ""

# Check 4: Package structure
echo "4️⃣  Verifying package structure..."
if [ -f "pnpm-workspace.yaml" ]; then
  echo "✅ pnpm-workspace.yaml exists"
else
  echo "❌ pnpm-workspace.yaml missing"
  exit 1
fi

if [ -d "packages/schemas" ]; then
  echo "✅ packages/schemas exists"
else
  echo "❌ packages/schemas missing"
  exit 1
fi

if [ -f "packages/schemas/dist/index.js" ]; then
  echo "✅ packages/schemas built"
else
  echo "❌ packages/schemas not built"
  exit 1
fi
echo ""

# Check 5: Run tests
echo "5️⃣  Running tests..."
cd packages/schemas
npm test
cd ../..
echo ""

echo "✨ Foundation checkpoint passed!"
echo ""
echo "📝 Summary:"
echo "   ✅ Prisma schema with pgvector configured"
echo "   ✅ Shared schemas package working"
echo "   ✅ Environment files complete"
echo "   ✅ Package structure correct"
echo "   ✅ All tests passing"
echo ""
echo "🚀 Ready to proceed to Phase 1: API Server Core"
