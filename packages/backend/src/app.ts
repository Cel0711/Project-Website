import cors from 'cors';
import express, { type Express } from 'express';
import { API_ROUTES } from '@coreloop/shared';
import { env } from './config/env.js';
import { errorHandler, notFound } from './middleware/error-handler.js';
import { healthRouter } from './routes/health.js';
import { quotesRouter } from './routes/quotes.js';
import { QuotesService } from './services/quotes.service.js';
import { createStorage } from './storage/index.js';

export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(
    cors({
      origin: env.corsOrigins.length ? env.corsOrigins : false,
    }),
  );
  // Design payloads can carry a few hundred elements' worth of props; 2mb
  // comfortably covers that without leaving the body parser unbounded.
  app.use(express.json({ limit: '2mb' }));

  const service = new QuotesService(createStorage());

  app.use(API_ROUTES.health, healthRouter());
  app.use(API_ROUTES.quotes, quotesRouter(service));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
