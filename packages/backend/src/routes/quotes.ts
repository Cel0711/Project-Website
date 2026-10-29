import { clientQuoteActionSchema, submitQuoteSchema, type CreateQuoteResponse, type GetQuoteResponse, type ListQuotesResponse } from '@coreloop/shared';
import { Router } from 'express';
import { parse, wrap } from '../lib/http-error.js';
import { requireRole, requireVerified } from '../middleware/auth.js';
import type { Limiters } from '../middleware/limits.js';
import type { QuotesService } from '../services/quotes.service.js';

/** A client's own quote requests. Everything here is scoped to the signed-in client. */
export function quotesRouter(quotes: QuotesService, limits: Limiters): Router {
  const router = Router();
  const client = requireRole('client');

  router.post(
    '/',
    client,
    requireVerified,
    limits.quote,
    wrap(async (req, res) => {
      const quote = await quotes.create(req.user!, parse(submitQuoteSchema, req.body), req.ip ?? '');
      const body: CreateQuoteResponse = { ok: true, quote };
      res.status(201).json(body);
    }),
  );

  router.get(
    '/',
    client,
    wrap(async (req, res) => {
      const list = await quotes.listForClient(req.user!.id);
      const body: ListQuotesResponse = { ok: true, quotes: list, total: list.length };
      res.json(body);
    }),
  );

  router.get(
    '/:id',
    client,
    wrap(async (req, res) => {
      const body: GetQuoteResponse = { ok: true, quote: await quotes.getForClient(req.user!.id, String(req.params['id'])) };
      res.json(body);
    }),
  );

  for (const action of ['approve', 'decline', 'cancel'] as const) {
    router.post(
      `/:id/${action}`,
      client,
      wrap(async (req, res) => {
        const input = parse(clientQuoteActionSchema, req.body ?? {});
        const body: GetQuoteResponse = { ok: true, quote: await quotes.clientAct(req.user!, String(req.params['id']), action, input.note, req.ip ?? '') };
        res.json(body);
      }),
    );
  }

  return router;
}
