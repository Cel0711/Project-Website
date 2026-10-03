import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';

/** Guards the owner-inbox routes with a static bearer token (see .env.example). */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!env.adminToken) {
    res.status(503).json({ ok: false, error: 'Admin routes are disabled: set ADMIN_TOKEN to enable them.' });
    return;
  }
  const header = req.header('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : '';
  if (!token || token !== env.adminToken) {
    res.status(401).json({ ok: false, error: 'Unauthorized' });
    return;
  }
  next();
}
