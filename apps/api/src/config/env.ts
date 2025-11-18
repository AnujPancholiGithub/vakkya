import { envSchema, type Env } from '@vakkya/schemas';
import { z } from 'zod';

export type { Env };

export function validateEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missing = error.errors.map((e) => e.path.join('.')).join(', ');
      throw new Error(`Missing or invalid environment variables: ${missing}`);
    }
    throw error;
  }
}

// Export validated environment variables
export const env = validateEnv();
