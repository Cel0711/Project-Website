import { invoiceSchema, paymentSchema } from '@coreloop/shared';
import { Router } from 'express';
import { parse, wrap } from '../lib/http-error.js';
import { requireRole } from '../middleware/auth.js';
import type { FinanceService, InvoiceFilter } from '../services/finance.service.js';
import type { UsersService } from '../services/users.service.js';

const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
const num = (v: unknown, d: number): number => (Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : d);

function filterOf(q: Record<string, unknown>): InvoiceFilter {
  return { status: str(q['status']), clientId: str(q['clientId']), currency: str(q['currency']), search: str(q['q']), limit: num(q['limit'], 50), offset: num(q['offset'], 0) };
}

/** The Finance workspace. Finance and Admin both work here. */
export function financeRouter(finance: FinanceService, users: UsersService): Router {
  const router = Router();
  router.use(requireRole('finance', 'admin'));

  router.get(
    '/summary',
    wrap(async (req, res) => {
      res.json({ ok: true, summary: await finance.summary(str(req.query['currency'])) });
    }),
  );

  router.get(
    '/invoices',
    wrap(async (req, res) => {
      res.json({ ok: true, ...(await finance.list(filterOf(req.query))) });
    }),
  );

  router.post(
    '/invoices',
    wrap(async (req, res) => {
      res.status(201).json({ ok: true, invoice: await finance.create(req.user!, parse(invoiceSchema, req.body), req.ip ?? '') });
    }),
  );

  router.get(
    '/invoices/:id',
    wrap(async (req, res) => {
      res.json({ ok: true, invoice: await finance.get(String(req.params['id'])) });
    }),
  );

  router.put(
    '/invoices/:id',
    wrap(async (req, res) => {
      res.json({ ok: true, invoice: await finance.update(req.user!, String(req.params['id']), parse(invoiceSchema, req.body), req.ip ?? '') });
    }),
  );

  router.delete(
    '/invoices/:id',
    wrap(async (req, res) => {
      await finance.remove(req.user!, String(req.params['id']), req.ip ?? '');
      res.json({ ok: true });
    }),
  );

  router.post(
    '/invoices/:id/send',
    wrap(async (req, res) => {
      res.json({ ok: true, invoice: await finance.send(req.user!, String(req.params['id']), req.ip ?? '') });
    }),
  );

  router.post(
    '/invoices/:id/void',
    wrap(async (req, res) => {
      res.json({ ok: true, invoice: await finance.void(req.user!, String(req.params['id']), req.ip ?? '') });
    }),
  );

  router.post(
    '/invoices/:id/payments',
    wrap(async (req, res) => {
      res.status(201).json({ ok: true, invoice: await finance.recordPayment(req.user!, String(req.params['id']), parse(paymentSchema, req.body), req.ip ?? '') });
    }),
  );

  router.post(
    '/invoices/:id/remind',
    wrap(async (req, res) => {
      await finance.remind(req.user!, String(req.params['id']), req.ip ?? '');
      res.json({ ok: true });
    }),
  );

  router.get(
    '/payments',
    wrap(async (req, res) => {
      res.json({ ok: true, ...(await finance.payments({ currency: str(req.query['currency']), limit: num(req.query['limit'], 100), offset: num(req.query['offset'], 0) })) });
    }),
  );

  router.get(
    '/balances',
    wrap(async (_req, res) => {
      res.json({ ok: true, balances: await finance.balances() });
    }),
  );

  router.get(
    '/clients',
    wrap(async (req, res) => {
      res.json({ ok: true, clients: await users.clientDirectory(str(req.query['q'])) });
    }),
  );

  router.get(
    '/export.csv',
    wrap(async (req, res) => {
      const csv = await finance.exportCsv(filterOf(req.query));
      res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="lablace-invoices.csv"' }).send(csv);
    }),
  );

  return router;
}

/** A client's own invoices: sent ones only, never anyone else's. */
export function invoicesRouter(finance: FinanceService): Router {
  const router = Router();
  router.use(requireRole('client'));

  router.get(
    '/',
    wrap(async (req, res) => {
      res.json({ ok: true, ...(await finance.list({ ...filterOf(req.query), clientId: undefined, onlyClient: req.user!.id })) });
    }),
  );

  router.get(
    '/:id',
    wrap(async (req, res) => {
      res.json({ ok: true, invoice: await finance.get(String(req.params['id']), { clientId: req.user!.id }) });
    }),
  );

  return router;
}
