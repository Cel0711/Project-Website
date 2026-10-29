import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { API_ROUTES } from '@coreloop/shared';
import { env } from './config/env.js';
import { buildServices } from './context.js';
import { createDbFromEnv } from './db/pool.js';
import type { Db } from './db/types.js';
import { HttpError } from './lib/http-error.js';
import { sessionLoader } from './middleware/auth.js';
import { errorHandler, notFound } from './middleware/error-handler.js';
import { sameOrigin } from './middleware/origin.js';
import { adminRouter } from './routes/admin.js';
import { authRouter } from './routes/auth.js';
import { financeRouter, invoicesRouter } from './routes/finance.js';
import { healthRouter } from './routes/health.js';
import { conversationsRouter, eventsRouter, notificationsRouter } from './routes/messages.js';
import { meRouter } from './routes/me.js';
import { quotesRouter } from './routes/quotes.js';
import { createMailer, type Mailer } from './services/mailer.js';

export interface AppOptions {
  /** Pass a database (tests do); leave undefined to use DATABASE_URL; null for none. */
  db?: Db | null;
  mailer?: Mailer;
  /** Rate limits are on unless a test switches them off. */
  rateLimits?: boolean;
}

export function createApp(opts: AppOptions = {}): Express {
  const app = express();
  app.disable('x-powered-by');
  if (env.isProd) app.set('trust proxy', 1); // behind nginx: real client address for rate limits and logs

  app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'same-site' } }));
  app.use(cors({ origin: env.corsOrigins.length ? env.corsOrigins : false, credentials: true }));
  // Design payloads can carry a few hundred elements' worth of props; 2mb
  // comfortably covers that without leaving the body parser unbounded.
  app.use(express.json({ limit: '2mb' }));
  app.use(cookieParser());
  app.use(sameOrigin([env.appUrl, ...env.corsOrigins]));

  const db = opts.db === undefined ? createDbFromEnv() : opts.db;
  app.use(API_ROUTES.health, healthRouter(db));

  if (!db) {
    app.use('/api', (_req, _res, next) => next(new HttpError(503, 'The database is not configured. Set DATABASE_URL in packages/backend/.env.')));
  } else {
    const s = buildServices(db, opts.mailer ?? createMailer(), opts.rateLimits ?? true);
    s.hub.start();
    app.locals['close'] = async (): Promise<void> => {
      s.hub.stop();
      await db.close();
    };

    app.use('/api', sessionLoader(db), s.limits.api);
    app.use(API_ROUTES.auth, authRouter(s.auth, s.limits));
    app.use(API_ROUTES.me, meRouter(s.auth));
    app.use(API_ROUTES.quotes, quotesRouter(s.quotes, s.limits));
    app.use(API_ROUTES.admin, adminRouter(s.quotes, s.users, db));
    app.use(API_ROUTES.conversations, conversationsRouter(s.messages, s.limits));
    app.use(API_ROUTES.notifications, notificationsRouter(db));
    app.use(API_ROUTES.events, eventsRouter(s.hub));
    app.use(API_ROUTES.finance, financeRouter(s.finance, s.users));
    app.use(API_ROUTES.invoices, invoicesRouter(s.finance));
  }

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
