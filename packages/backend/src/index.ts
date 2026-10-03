import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';

const app = createApp();

const server = app.listen(env.port, () => {
  logger.info('coreloop-api listening', {
    port: env.port,
    storageDriver: env.storageDriver,
    corsOrigins: env.corsOrigins,
    adminEnabled: !!env.adminToken,
  });
});

function shutdown(signal: string): void {
  logger.info('shutting down', { signal });
  server.close(() => process.exit(0));
  // PM2 sends SIGINT on stop/restart; force-exit if close hangs.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
