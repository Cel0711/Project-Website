import type { RequestHandler } from 'express';
import { forbidden } from '../lib/http-error.js';

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF guard for cookie sessions, on top of SameSite=Lax: a write that carries an Origin header must come from
 * the site itself (or an allowed origin). Requests without Origin (curl, server-to-server) are not browsers
 * acting on a victim's cookie, so they pass.
 */
export function sameOrigin(allowed: string[]): RequestHandler {
  const ok = new Set(allowed.map((o) => o.replace(/\/$/, '')));
  return (req, _res, next) => {
    if (SAFE.has(req.method)) return next();
    const origin = req.get('origin');
    if (!origin) return next();
    if (ok.has(origin.replace(/\/$/, ''))) return next();
    try {
      if (new URL(origin).host === req.get('host')) return next();
    } catch {
      /* malformed Origin falls through to the rejection */
    }
    next(forbidden('Cross-site request blocked.'));
  };
}
