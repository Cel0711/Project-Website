import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../lib/http-error.js';
import { logger } from '../utils/logger.js';

export function notFound(req: Request, res: Response): void {
  res.status(404).json({ ok: false, error: `No route for ${req.method} ${req.path}` });
}

const DB_DOWN = new Set(['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', '57P01', '57P03', '08006', '08001', '08004']);

function code(err: unknown): string {
  return typeof err === 'object' && err !== null && 'code' in err ? String((err as { code: unknown }).code) : '';
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (res.headersSent) return;
  if (err instanceof HttpError) {
    res.status(err.status).json({ ok: false, error: err.message, ...err.extra });
    return;
  }
  const c = code(err);
  const type = typeof err === 'object' && err !== null && 'type' in err ? String((err as { type: unknown }).type) : '';
  if (type === 'entity.too.large') {
    res.status(413).json({ ok: false, error: 'That request is too large.' });
    return;
  }
  if (type === 'entity.parse.failed') {
    res.status(400).json({ ok: false, error: 'The request body is not valid JSON.' });
    return;
  }
  if (c === '23505') {
    res.status(409).json({ ok: false, error: 'That already exists.' });
    return;
  }
  if (DB_DOWN.has(c)) {
    logger.error('database unreachable', { path: req.path, code: c });
    res.status(503).json({ ok: false, error: 'The service is temporarily unavailable. Please try again in a moment.' });
    return;
  }
  logger.error('unhandled request error', { path: req.path, error: String(err) });
  res.status(500).json({ ok: false, error: 'Internal server error' });
}
