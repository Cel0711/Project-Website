import {
  addEventSchema,
  createStaffSchema,
  offerSchema,
  staffUpdateQuoteSchema,
  updateUserSchema,
  type GetQuoteResponse,
  type ListQuotesResponse,
  type ListUsersResponse,
} from '@coreloop/shared';
import { Router } from 'express';
import type { Db } from '../db/types.js';
import { isoOf } from '../db/types.js';
import { parse, wrap } from '../lib/http-error.js';
import { requireRole } from '../middleware/auth.js';
import type { QuotesService } from '../services/quotes.service.js';
import type { UsersService } from '../services/users.service.js';

const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
const num = (v: unknown, d: number): number => (Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : d);

/**
 * Team side. Admin and Finance can read requests and the client list; only Admin changes requests and manages users.
 */
export function adminRouter(quotes: QuotesService, users: UsersService, db: Db): Router {
  const router = Router();
  const staff = requireRole('admin', 'finance');
  const admin = requireRole('admin');

  /* ---------- requests ---------- */

  router.get(
    '/quotes',
    staff,
    wrap(async (req, res) => {
      const r = await quotes.listForStaff({
        status: str(req.query['status']),
        search: str(req.query['q']),
        assignedTo: str(req.query['assignedTo']),
        clientId: str(req.query['clientId']),
        limit: num(req.query['limit'], 50),
        offset: num(req.query['offset'], 0),
      });
      const body: ListQuotesResponse = { ok: true, ...r };
      res.json(body);
    }),
  );

  router.get(
    '/quotes/:id',
    staff,
    wrap(async (req, res) => {
      const body: GetQuoteResponse = { ok: true, quote: await quotes.getForStaff(String(req.params['id'])) };
      res.json(body);
    }),
  );

  router.patch(
    '/quotes/:id',
    admin,
    wrap(async (req, res) => {
      const quote = await quotes.staffUpdate(req.user!, String(req.params['id']), parse(staffUpdateQuoteSchema, req.body), req.ip ?? '');
      res.json({ ok: true, quote });
    }),
  );

  router.post(
    '/quotes/:id/events',
    admin,
    wrap(async (req, res) => {
      const quote = await quotes.addEvent(req.user!, String(req.params['id']), parse(addEventSchema, req.body), req.ip ?? '');
      res.status(201).json({ ok: true, quote });
    }),
  );

  router.post(
    '/quotes/:id/offer',
    admin,
    wrap(async (req, res) => {
      const quote = await quotes.sendOffer(req.user!, String(req.params['id']), parse(offerSchema, req.body), req.ip ?? '');
      res.json({ ok: true, quote });
    }),
  );

  router.get(
    '/stats',
    admin,
    wrap(async (_req, res) => {
      res.json({ ok: true, stats: await quotes.stats() });
    }),
  );

  /* ---------- clients (for pickers) ---------- */

  router.get(
    '/clients',
    staff,
    wrap(async (req, res) => {
      res.json({ ok: true, clients: await users.clientDirectory(str(req.query['q'])) });
    }),
  );

  /* ---------- team accounts ---------- */

  router.get(
    '/users',
    admin,
    wrap(async (req, res) => {
      const r = await users.list({ role: str(req.query['role']), status: str(req.query['status']), search: str(req.query['q']), limit: num(req.query['limit'], 100), offset: num(req.query['offset'], 0) });
      const body: ListUsersResponse & { total: number } = { ok: true, ...r };
      res.json(body);
    }),
  );

  router.post(
    '/users',
    admin,
    wrap(async (req, res) => {
      const created = await users.createStaff(req.user!, parse(createStaffSchema, req.body), req.ip ?? '');
      res.status(201).json({ ok: true, ...created });
    }),
  );

  router.patch(
    '/users/:id',
    admin,
    wrap(async (req, res) => {
      res.json({ ok: true, user: await users.update(req.user!, String(req.params['id']), parse(updateUserSchema, req.body), req.ip ?? '') });
    }),
  );

  router.post(
    '/users/:id/reset',
    admin,
    wrap(async (req, res) => {
      res.json({ ok: true, ...(await users.resetPassword(req.user!, String(req.params['id']), req.ip ?? '')) });
    }),
  );

  /* ---------- audit trail ---------- */

  router.get(
    '/audit',
    admin,
    wrap(async (req, res) => {
      const limit = Math.min(num(req.query['limit'], 100), 300);
      const rows = await db.query(
        `select a.id, a.action, a.entity, a.entity_id, a.meta, a.ip, a.created_at, u.full_name as actor_name, u.role as actor_role
           from audit_log a left join users u on u.id = a.actor_id order by a.id desc limit ${limit} offset ${num(req.query['offset'], 0)}`,
      );
      res.json({
        ok: true,
        entries: rows.rows.map((r) => ({ id: r.id, action: r.action, entity: r.entity, entityId: r.entity_id, meta: r.meta, ip: r.ip, actor: r.actor_name ? { fullName: r.actor_name, role: r.actor_role } : null, createdAt: isoOf(r.created_at) })),
      });
    }),
  );

  return router;
}
