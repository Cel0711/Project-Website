import { Router } from 'express';
import type { HealthResponse } from '@coreloop/shared';
import type { Db } from '../db/types.js';

async function dbIsUp(db: Db | null): Promise<boolean> {
  if (!db) return false;
  try {
    await Promise.race([db.query('select 1'), new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))]);
    return true;
  } catch {
    return false;
  }
}

export function healthRouter(db: Db | null): Router {
  const router = Router();

  router.get('/', async (_req, res) => {
    const body: HealthResponse = {
      ok: true,
      service: 'coreloop-api',
      uptimeSeconds: Math.round(process.uptime()),
      db: (await dbIsUp(db)) ? 'up' : 'down',
    };
    res.json(body);
  });

  return router;
}
