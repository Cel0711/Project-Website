import type { Request, RequestHandler } from 'express';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import { HttpError } from '../lib/http-error.js';

export interface Limiters {
  /** Sign-in attempts per address (accounts also lock themselves after repeated failures). */
  login: RequestHandler;
  register: RequestHandler;
  /** Anything that sends an email: forgot, remind, resend. */
  mail: RequestHandler;
  quote: RequestHandler;
  message: RequestHandler;
  api: RequestHandler;
}

const pass: RequestHandler = (_req, _res, next) => next();

const byIp = (req: Request): string => ipKeyGenerator(req.ip ?? '');
const byUser = (req: Request): string => req.user?.id ?? byIp(req);

function limiter(windowMs: number, limit: number, key: (req: Request) => string): RequestHandler {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: key,
    handler: (_req, _res, next) => next(new HttpError(429, 'Too many requests. Please wait a moment and try again.', { code: 'rate_limited' })),
  });
}

const MIN = 60_000;

/** In-memory limits (the API is a single PM2 process). Pass `false` to switch them all off, as the tests do. */
export function createLimiters(enabled: boolean): Limiters {
  if (!enabled) return { login: pass, register: pass, mail: pass, quote: pass, message: pass, api: pass };
  return {
    login: limiter(15 * MIN, 30, byIp),
    register: limiter(60 * MIN, 10, byIp),
    mail: limiter(60 * MIN, 8, byIp),
    quote: limiter(60 * MIN, 20, byUser),
    message: limiter(MIN, 90, byUser),
    api: limiter(15 * MIN, 2000, byIp),
  };
}
