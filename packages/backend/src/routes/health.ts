import { Router } from 'express';
import type { HealthResponse } from '@coreloop/shared';

export function healthRouter(): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    const body: HealthResponse = {
      ok: true,
      service: 'coreloop-api',
      uptimeSeconds: Math.round(process.uptime()),
    };
    res.json(body);
  });

  return router;
}
