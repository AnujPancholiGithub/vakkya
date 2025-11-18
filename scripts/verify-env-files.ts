#!/usr/bin/env tsx

/**
 * Verify that all .env.example files are complete and consistent
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

console.log('🔍 Verifying .env.example files...\n');

const services = [
  { name: 'API Server', path: 'apps/api/.env.example' },
];

let allValid = true;

for (const service of services) {
  console.log(`Checking ${service.name}...`);
  
  const fullPath = join(process.cwd(), service.path);
  
  if (!existsSync(fullPath)) {
    console.error(`❌ ${service.path} does not exist`);
    allValid = false;
    continue;
  }
  
  const content = readFileSync(fullPath, 'utf-8');
  
  // Required variables for API server
  const requiredVars = [
    'NODE_ENV',
    'PORT',
    'DATABASE_URL',
    'JWT_SECRET',
    'JWT_EXPIRES_IN',
    'OPENAI_API_KEY',
    'ALLOWED_ORIGINS',
  ];
  
  const missingVars = requiredVars.filter(v => !content.includes(v));
  
  if (missingVars.length > 0) {
    console.error(`❌ Missing variables: ${missingVars.join(', ')}`);
    allValid = false;
  } else {
    console.log(`✅ All required variables present`);
  }
  
  // Check for deprecated variables
  const deprecatedVars = [
    'REDIS_URL',
    'CLERK_SECRET_KEY',
    'CLERK_PUBLISHABLE_KEY',
    'PINECONE_API_KEY',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'SENTRY_DSN',
  ];
  
  const foundDeprecated = deprecatedVars.filter(v => content.includes(v));
  
  if (foundDeprecated.length > 0) {
    console.warn(`⚠️  Deprecated variables found: ${foundDeprecated.join(', ')}`);
    console.warn(`   These should be removed per tech.md`);
    allValid = false;
  } else {
    console.log(`✅ No deprecated variables`);
  }
  
  console.log('');
}

if (allValid) {
  console.log('✨ All .env.example files are valid!\n');
  process.exit(0);
} else {
  console.error('❌ Some .env.example files have issues\n');
  process.exit(1);
}
