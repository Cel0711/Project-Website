import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';

const app = createApp();

const server = app.listen(env.port, () => {
  logger.info('coreloop-api listening', {
    port: env.port,
    env: env.nodeEnv,
    database: env.databaseUrl ? 'configured' : 'NOT configured (set DATABASE_URL)',
    schema: env.dbSchema ?? 'public',
    email: env.smtp ? 'smtp' : 'off (SMTP not configured)',
    corsOrigins: env.corsOrigins,
    appUrl: env.appUrl,
  });
});

function shutdown(signal: string): void {
  logger.info('shutting down', { signal });
  server.close(() => {
    const close = app.locals['close'] as (() => Promise<void>) | undefined;
    (close ? close() : Promise.resolve()).finally(() => process.exit(0));
  });
  // PM2 sends SIGINT on stop/restart; force-exit if close hangs (open event streams keep the server alive).
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
