import { env } from './config/env.js';
import type { Db } from './db/types.js';
import { SseHub } from './lib/sse.js';
import { createLimiters, type Limiters } from './middleware/limits.js';
import { AuthService } from './services/auth.service.js';
import type { Mailer } from './services/mailer.js';
import { FinanceService } from './services/finance.service.js';
import { MessagesService } from './services/messages.service.js';
import { Notifier } from './services/notifier.js';
import { QuotesService } from './services/quotes.service.js';
import { UsersService } from './services/users.service.js';

/** Everything the routes need, wired once at start-up. */
export interface Services {
  db: Db;
  hub: SseHub;
  limits: Limiters;
  notifier: Notifier;
  auth: AuthService;
  users: UsersService;
  quotes: QuotesService;
  messages: MessagesService;
  finance: FinanceService;
}

export function buildServices(db: Db, mailer: Mailer, rateLimits: boolean): Services {
  const hub = new SseHub();
  const notifier = new Notifier(hub, mailer, { appUrl: env.appUrl, companyName: env.companyName, notifyEmail: env.notifyEmail });
  const messages = new MessagesService(db, notifier);
  return {
    db,
    hub,
    limits: createLimiters(rateLimits),
    notifier,
    auth: new AuthService(db, notifier, env.sessionTtlDays),
    users: new UsersService(db, notifier),
    quotes: new QuotesService(db, notifier),
    messages,
    finance: new FinanceService(db, notifier, messages),
  };
}
