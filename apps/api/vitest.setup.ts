import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env.test file manually
const envFile = resolve(process.cwd(), '.env.test');
try {
  const envContent = readFileSync(envFile, 'utf-8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').replace(/^["']|["']$/g, '');
        process.env[key.trim()] = value.trim();
      }
    }
  });
} catch (error) {
  console.error('Failed to load .env.test file:', error);
}
