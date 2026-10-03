import { Router } from 'express';
import type { CreateQuoteResponse, GetQuoteResponse, ListQuotesResponse } from '@coreloop/shared';
import { requireAdmin } from '../middleware/require-admin.js';
import type { QuotesService } from '../services/quotes.service.js';

export function quotesRouter(service: QuotesService): Router {
  const router = Router();

  // Public: the quote form posts here. No auth — this is the site's
  // "contact us" path, equivalent to the old mailto:/claude.ai-db submit.
  router.post('/', async (req, res, next) => {
    try {
      const record = await service.create(req.body);
      const body: CreateQuoteResponse = { ok: true, quote: record };
      res.status(201).json(body);
    } catch (err) {
      next(err);
    }
  });

  // Admin-only from here down: the "owner inbox" equivalent.
  router.get('/', requireAdmin, async (req, res, next) => {
    try {
      const limitParam = Number(req.query['limit']);
      const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 200) : 50;
      const quotes = await service.list(limit);
      const body: ListQuotesResponse = { ok: true, quotes };
      res.json(body);
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id', requireAdmin, async (req, res, next) => {
    try {
      const quote = await service.getById(req.params['id'] ?? '');
      if (!quote) {
        res.status(404).json({ ok: false, error: 'Not found' });
        return;
      }
      const body: GetQuoteResponse = { ok: true, quote };
      res.json(body);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
