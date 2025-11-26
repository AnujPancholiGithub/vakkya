import 'dotenv/config';
import { validateEnv } from './config/env.js';
import { createLogger } from './config/logger.js';
import { createApp } from './app.js';

async function main() {
  // Validate environment variables on startup (fail-fast)
  const env = validateEnv();
  
  // Create logger
  const logger = createLogger(env);
  
  try {
    // Create Fastify app
    const app = await createApp(env, logger);
    
    // Start server
    await app.listen({
      port: env.PORT,
      host: '0.0.0.0',
    });
    
    logger.info(`API Server listening on port ${env.PORT}`);
  } catch (error) {
    logger.error(error, 'Failed to start server');
    process.exit(1);
  }
}

main();
