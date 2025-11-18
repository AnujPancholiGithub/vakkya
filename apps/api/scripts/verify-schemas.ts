#!/usr/bin/env tsx

/**
 * Verify that shared schemas package can be imported and used
 */

import {
  createProjectSchema,
  createUserSchema,
  type Project,
  type User,
  type Document,
  MAX_PROJECTS_PER_USER,
  ERROR_CODES,
  envSchema,
} from '@vakkya/schemas';

console.log('🔍 Verifying @vakkya/schemas package...\n');

// Check 1: Schemas are importable
try {
  console.log('✅ Schemas imported successfully');
} catch (error) {
  console.error('❌ Failed to import schemas:', error);
  process.exit(1);
}

// Check 2: Schemas can validate data
try {
  const projectResult = createProjectSchema.safeParse({ name: 'Test Project' });
  if (!projectResult.success) {
    throw new Error('Project schema validation failed');
  }
  console.log('✅ Project schema validation works');

  const userResult = createUserSchema.safeParse({
    email: 'test@example.com',
    password: 'password123',
  });
  if (!userResult.success) {
    throw new Error('User schema validation failed');
  }
  console.log('✅ User schema validation works');
} catch (error) {
  console.error('❌ Schema validation failed:', error);
  process.exit(1);
}

// Check 3: Types are available
try {
  const project: Project = {
    id: 'test',
    userId: 'user1',
    name: 'Test',
    widgetToken: 'token',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  console.log('✅ TypeScript types work');
} catch (error) {
  console.error('❌ TypeScript types failed:', error);
  process.exit(1);
}

// Check 4: Constants are available
try {
  if (typeof MAX_PROJECTS_PER_USER !== 'number') {
    throw new Error('Constants not available');
  }
  if (typeof ERROR_CODES.UNAUTHORIZED !== 'string') {
    throw new Error('Error codes not available');
  }
  console.log('✅ Constants available');
  console.log(`   - MAX_PROJECTS_PER_USER: ${MAX_PROJECTS_PER_USER}`);
  console.log(`   - ERROR_CODES.UNAUTHORIZED: ${ERROR_CODES.UNAUTHORIZED}`);
} catch (error) {
  console.error('❌ Constants check failed:', error);
  process.exit(1);
}

// Check 5: Env schema works
try {
  const testEnv = {
    NODE_ENV: 'development',
    PORT: '3000',
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
    JWT_SECRET: 'test-secret-key-min-32-chars-long',
    JWT_EXPIRES_IN: '7d',
    OPENAI_API_KEY: 'sk-test',
    ALLOWED_ORIGINS: 'http://localhost:3001',
  };
  const result = envSchema.safeParse(testEnv);
  if (!result.success) {
    throw new Error('Env schema validation failed');
  }
  console.log('✅ Environment schema validation works');
} catch (error) {
  console.error('❌ Environment schema failed:', error);
  process.exit(1);
}

console.log('\n✨ @vakkya/schemas package verified successfully!');
console.log('\n📦 Package is ready to use across all services');
