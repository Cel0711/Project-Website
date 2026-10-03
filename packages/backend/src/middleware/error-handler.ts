import type { NextFunction, Request, Response } from 'express';
import { ValidationError } from '../services/quotes.service.js';
import { logger } from '../utils/logger.js';

export function notFound(req: Request, res: Response): void {
  res.status(404).json({ ok: false, error: `No route for ${req.method} ${req.path}` });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ValidationError) {
    res.status(400).json({ ok: false, error: 'Invalid request', issues: err.issues });
    return;
  }
  logger.error('unhandled request error', { path: req.path, error: String(err) });
  res.status(500).json({ ok: false, error: 'Internal server error' });
}
