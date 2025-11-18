#!/usr/bin/env tsx

/**
 * Verify Prisma setup without requiring database connection
 * Checks that schema is valid and client is generated
 */

import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';

console.log('🔍 Verifying Prisma setup...\n');

// Check 1: Prisma schema exists
try {
  const schemaPath = join(process.cwd(), 'prisma', 'schema.prisma');
  const schema = readFileSync(schemaPath, 'utf-8');
  console.log('✅ Prisma schema file exists');

  // Check for required models
  const requiredModels = ['User', 'Project', 'Document', 'DocumentChunk', 'Conversation', 'ConversationTurn'];
  const missingModels = requiredModels.filter(model => !schema.includes(`model ${model}`));

  if (missingModels.length > 0) {
    console.error('❌ Missing models:', missingModels.join(', '));
    process.exit(1);
  }
  console.log('✅ All required models present');

  // Check for pgvector extension
  if (!schema.includes('extensions = [vector]')) {
    console.error('❌ pgvector extension not configured');
    process.exit(1);
  }
  console.log('✅ pgvector extension configured');

} catch (error) {
  console.error('❌ Failed to read Prisma schema:', error);
  process.exit(1);
}

// Check 2: Prisma Client is generated
try {
  const prisma = new PrismaClient();
  console.log('✅ Prisma Client generated successfully');

  // Check that all models are accessible
  const models = ['user', 'project', 'document', 'documentChunk', 'conversation', 'conversationTurn'];
  for (const model of models) {
    if (!(model in prisma)) {
      console.error(`❌ Model ${model} not found in Prisma Client`);
      process.exit(1);
    }
  }
  console.log('✅ All models accessible in Prisma Client');

} catch (error) {
  console.error('❌ Failed to instantiate Prisma Client:', error);
  console.log('\n💡 Run: npx prisma generate');
  process.exit(1);
}

// Check 3: Migration files exist
try {
  const migrationPath = join(process.cwd(), 'prisma', 'migrations', '20241118000000_init', 'migration.sql');
  const migration = readFileSync(migrationPath, 'utf-8');
  console.log('✅ Initial migration file exists');

  // Check for pgvector extension in migration
  if (!migration.includes('CREATE EXTENSION IF NOT EXISTS vector')) {
    console.error('❌ pgvector extension not in migration');
    process.exit(1);
  }
  console.log('✅ pgvector extension in migration');

} catch (error) {
  console.error('❌ Failed to read migration file:', error);
  process.exit(1);
}

console.log('\n✨ Prisma setup verified successfully!');
console.log('\n📝 Next steps:');
console.log('   1. Set up PostgreSQL database (Railway or local)');
console.log('   2. Update DATABASE_URL in .env');
console.log('   3. Run: npm run db:migrate');
console.log('   4. Start dev server: npm run dev');
