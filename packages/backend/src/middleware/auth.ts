import type { PublicUser, UserRole } from '@coreloop/shared';
import type { CookieOptions, RequestHandler } from 'express';
import { env } from '../config/env.js';
import type { Db } from '../db/types.js';
import { forbidden, unauthorized, wrap } from '../lib/http-error.js';
import { findSession, touchSession } from '../repos/security.repo.js';
import { toPublic } from '../repos/users.repo.js';

export const SESSION_COOKIE = 'll_sid';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: PublicUser;
      sessionId?: string;
    }
  }
}

export function cookieOptions(): CookieOptions {
  return { httpOnly: true, sameSite: 'lax', secure: env.cookieSecure, path: '/', maxAge: env.sessionTtlDays * 86_400_000 };
}

const TOUCH_EVERY_MS = 5 * 60_000;

/** Reads the session cookie on every request and, when it is valid, puts the signed-in user on `req.user`. */
export function sessionLoader(db: Db): RequestHandler {
  return wrap(async (req, res, next) => {
    const token: unknown = req.cookies?.[SESSION_COOKIE];
    if (typeof token === 'string' && token.length >= 20) {
      const s = await findSession(db, token);
      if (s) {
        req.user = toPublic(s.user);
        req.sessionId = s.id;
        if (Date.now() - new Date(s.lastSeenAt).getTime() > TOUCH_EVERY_MS) {
          await touchSession(db, s.id, env.sessionTtlDays);
          res.cookie(SESSION_COOKIE, token, cookieOptions());
        }
      } else {
        res.clearCookie(SESSION_COOKIE, { path: '/' });
      }
    }
    next();
  });
}

/** The signed-in user. Until an invited or reset account has chosen its own password it can only reach the password screens. */
export function requireAuth(opts: { allowMustChange?: boolean } = {}): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) return next(unauthorized());
    if (req.user.mustChangePassword && !opts.allowMustChange) return next(forbidden('Choose a new password first.', 'must_change_password'));
    next();
  };
}

export function requireRole(...roles: UserRole[]): RequestHandler {
  const authed = requireAuth();
  return (req, res, next) => {
    authed(req, res, (err?: unknown) => {
      if (err) return next(err);
      if (!req.user || !roles.includes(req.user.role)) return next(forbidden());
      next();
    });
  };
}

/** Clients must have confirmed their email before they can send requests or messages. */
export const requireVerified: RequestHandler = (req, _res, next) => {
  if (req.user && req.user.role === 'client' && !req.user.emailVerified) return next(forbidden('Please confirm your email address first.', 'email_not_verified'));
  next();
};
