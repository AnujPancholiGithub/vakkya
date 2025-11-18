import { prisma } from './prisma.js';
import { logger } from '../config/logger.js';

/**
 * Check database connection and pgvector extension
 */
export async function checkDatabaseHealth(): Promise<{
  connected: boolean;
  pgvectorEnabled: boolean;
  error?: string;
}> {
  try {
    // Test basic connection
    await prisma.$queryRaw`SELECT 1`;

    // Check if pgvector extension is enabled
    const result = await prisma.$queryRaw<Array<{ extname: string }>>`
      SELECT extname FROM pg_extension WHERE extname = 'vector'
    `;

    const pgvectorEnabled = result.length > 0;

    if (!pgvectorEnabled) {
      logger.warn('pgvector extension is not enabled');
    }

    return {
      connected: true,
      pgvectorEnabled,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error: errorMessage }, 'Database health check failed');

    return {
      connected: false,
      pgvectorEnabled: false,
      error: errorMessage,
    };
  }
}
