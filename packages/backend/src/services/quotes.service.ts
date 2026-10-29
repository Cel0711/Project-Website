import {
  formatMoney,
  QUOTE_STATUS_LABEL,
  QUOTE_TRANSITIONS,
  type CurrencyCode,
  type PublicUser,
  type QuoteEvent,
  type QuoteOffer,
  type QuoteRecord,
  type QuoteStatus,
  type QuoteSummary,
} from '@coreloop/shared';
import type { z } from 'zod';
import type { addEventSchema, offerSchema, staffUpdateQuoteSchema, submitQuoteSchema } from '@coreloop/shared';
import { isoOf, type Db, type Queryable, type Row } from '../db/types.js';
import { badRequest, forbidden, notFound } from '../lib/http-error.js';
import * as emails from './email-templates.js';
import type { Notifier } from './notifier.js';
import { addNotification } from '../repos/notifications.repo.js';
import { audit } from '../repos/security.repo.js';
import { activeIdsByRole } from '../repos/users.repo.js';

type ClientAction = 'approve' | 'decline' | 'cancel';

const CLIENT_RULES: Record<ClientAction, { from: QuoteStatus[]; to: QuoteStatus; verb: string; text: string }> = {
  approve: { from: ['quoted'], to: 'accepted', verb: 'approved', text: 'Approved the quote.' },
  decline: { from: ['quoted'], to: 'declined', verb: 'declined', text: 'Declined the quote.' },
  cancel: { from: ['submitted', 'reviewing', 'quoted'], to: 'cancelled', verb: 'cancelled', text: 'Cancelled the request.' },
};

const SUMMARY_COLS = `q.id, q.ref, q.status, q.progress, q.currency, q.plan_name, q.kinds, q.element_count, q.offer_amount, q.offer_currency,
  q.created_at, q.updated_at, q.design is not null as has_design, q.client_id, q.assigned_to,
  c.full_name as client_name, c.email as client_email, c.company as client_company, a.full_name as assignee_name,
  (select cv.id from conversations cv where cv.quote_id = q.id) as conversation_id`;
const FROM = 'from quote_requests q join users c on c.id = q.client_id left join users a on a.id = q.assigned_to';

function summary(r: Row, staff: boolean): QuoteSummary {
  const base: QuoteSummary = {
    id: r.id,
    ref: r.ref,
    status: r.status,
    progress: r.progress,
    currency: r.currency,
    planName: r.plan_name ?? null,
    kinds: r.kinds ?? [],
    hasDesign: !!r.has_design,
    elementCount: r.element_count,
    offerAmount: r.offer_amount ?? null,
    offerCurrency: r.offer_currency ?? null,
    createdAt: isoOf(r.created_at),
    updatedAt: isoOf(r.updated_at),
    conversationId: r.conversation_id ?? null,
  };
  if (!staff) return base;
  return {
    ...base,
    client: { id: r.client_id, fullName: r.client_name, email: r.client_email, company: r.client_company },
    assignedTo: r.assigned_to ? { id: r.assigned_to, fullName: r.assignee_name } : null,
  };
}

function offerOf(r: Row): QuoteOffer | null {
  if (r.offer_amount == null) return null;
  return { amount: r.offer_amount, currency: r.offer_currency, summary: r.offer_summary ?? '', validUntil: r.offer_valid_until ?? null, sentAt: isoOf(r.offer_sent_at) };
}

function eventOf(r: Row): QuoteEvent {
  return {
    id: r.id,
    kind: r.kind,
    fromStatus: r.from_status ?? null,
    toStatus: r.to_status ?? null,
    progress: r.progress ?? null,
    body: r.body,
    visibleToClient: !!r.visible_to_client,
    actor: r.actor_id ? { id: r.actor_id, fullName: r.actor_name, role: r.actor_role } : null,
    createdAt: isoOf(r.created_at),
  };
}

export interface StaffListFilter {
  status?: string;
  search?: string;
  assignedTo?: string;
  clientId?: string;
  limit?: number;
  offset?: number;
}

export class QuotesService {
  constructor(
    private readonly db: Db,
    private readonly n: Notifier,
  ) {}

  /* ---------- reading ---------- */

  private async events(q: Queryable, quoteId: string, staff: boolean): Promise<QuoteEvent[]> {
    const r = await q.query(
      `select e.*, u.full_name as actor_name, u.role as actor_role from quote_events e left join users u on u.id = e.actor_id
        where e.quote_id = $1 ${staff ? '' : 'and e.visible_to_client'} order by e.id`,
      [quoteId],
    );
    return r.rows.map(eventOf);
  }

  private async detail(whereSql: string, params: unknown[], staff: boolean): Promise<QuoteRecord | null> {
    const r = await this.db.query(
      `select ${SUMMARY_COLS}, q.plan_id, q.budget, q.timeline, q.notes, q.contact, q.design,
              q.offer_currency, q.offer_summary, q.offer_valid_until, q.offer_sent_at ${FROM} where ${whereSql}`,
      params,
    );
    const row = r.rows[0];
    if (!row) return null;
    return {
      ...summary(row, staff),
      planId: row.plan_id ?? null,
      budget: row.budget,
      timeline: row.timeline,
      notes: row.notes,
      contact: { name: '', company: '', email: '', phone: '', ...(row.contact ?? {}) },
      design: row.design ?? null,
      offer: offerOf(row),
      events: await this.events(this.db, row.id, staff),
    };
  }

  async listForClient(userId: string): Promise<QuoteSummary[]> {
    const r = await this.db.query(`select ${SUMMARY_COLS} ${FROM} where q.client_id = $1 order by q.created_at desc`, [userId]);
    return r.rows.map((x) => summary(x, false));
  }

  /** A client only ever finds their own requests: someone else's id looks exactly like one that does not exist. */
  async getForClient(userId: string, idOrRef: string): Promise<QuoteRecord> {
    const rec = await this.detail('(q.id::text = $1 or q.ref = $1) and q.client_id = $2', [idOrRef, userId], false);
    if (!rec) throw notFound('Request not found');
    return rec;
  }

  async listForStaff(f: StaffListFilter): Promise<{ quotes: QuoteSummary[]; total: number }> {
    const where: string[] = [];
    const vals: unknown[] = [];
    const param = (v: unknown): string => {
      vals.push(v);
      return `$${vals.length}`;
    };
    if (f.status) where.push(`q.status = ${param(f.status)}`);
    if (f.assignedTo === 'none') where.push('q.assigned_to is null');
    else if (f.assignedTo) where.push(`q.assigned_to = ${param(f.assignedTo)}`);
    if (f.clientId) where.push(`q.client_id = ${param(f.clientId)}`);
    if (f.search) {
      const p = param(`%${f.search.replace(/[%_\\]/g, '\\$&')}%`);
      where.push(`(q.ref ilike ${p} or c.full_name ilike ${p} or c.email ilike ${p} or c.company ilike ${p})`);
    }
    const cond = where.length ? `where ${where.join(' and ')}` : '';
    const total = await this.db.query<{ n: number }>(`select count(*) as n ${FROM} ${cond}`, vals);
    const rows = await this.db.query(
      `select ${SUMMARY_COLS} ${FROM} ${cond} order by q.created_at desc limit ${Math.min(f.limit ?? 50, 200)} offset ${Math.max(f.offset ?? 0, 0)}`,
      vals,
    );
    return { quotes: rows.rows.map((x) => summary(x, true)), total: total.rows[0]?.n ?? 0 };
  }

  async getForStaff(idOrRef: string): Promise<QuoteRecord> {
    const rec = await this.detail('(q.id::text = $1 or q.ref = $1)', [idOrRef], true);
    if (!rec) throw notFound('Request not found');
    return rec;
  }

  /** Numbers for the Admin dashboard. */
  async stats(): Promise<{
    byStatus: Record<string, number>;
    newToday: number;
    awaitingReply: number;
    avgFirstActionHours: number | null;
    unassigned: number;
  }> {
    const by = await this.db.query<{ status: string; n: number }>('select status, count(*) as n from quote_requests group by status');
    const one = async (sql: string): Promise<number> => Number((await this.db.query<{ n: unknown }>(sql)).rows[0]?.n ?? 0);
    const avg = await this.db.query<{ h: string | null }>(
      `select avg(extract(epoch from (fr.first_at - q.created_at)) / 3600.0) as h
         from quote_requests q
         join lateral (select min(e.created_at) as first_at from quote_events e join users u on u.id = e.actor_id
                        where e.quote_id = q.id and u.role in ('admin', 'finance')) fr on fr.first_at is not null
        where q.created_at > now() - interval '90 days'`,
    );
    return {
      byStatus: Object.fromEntries(by.rows.map((r) => [r.status, r.n])),
      newToday: await one("select count(*) as n from quote_requests where created_at >= date_trunc('day', now())"),
      awaitingReply: await one(
        `select count(*) as n from conversations c
          where (select u.role from messages m join users u on u.id = m.sender_id where m.conversation_id = c.id order by m.id desc limit 1) = 'client'`,
      ),
      avgFirstActionHours: avg.rows[0]?.h == null ? null : Math.round(Number(avg.rows[0].h) * 10) / 10,
      unassigned: await one("select count(*) as n from quote_requests where assigned_to is null and status in ('submitted', 'reviewing')"),
    };
  }

  /* ---------- the client sends and answers ---------- */

  async create(user: PublicUser, input: z.output<typeof submitQuoteSchema>, ip = ''): Promise<QuoteRecord> {
    if (user.role !== 'client') throw forbidden('Only client accounts send quote requests. Staff manage them from the Requests page.');
    const currency = (input.currency ?? user.currency) as CurrencyCode;
    const design = input.design && input.design.elements.length ? input.design : null;
    const contact = { name: input.name, company: input.company, email: input.email, phone: input.phone };

    const made = await this.db.tx(async (q) => {
      const r = await q.query<{ id: string; ref: string }>(
        `insert into quote_requests (ref, client_id, currency, plan_id, plan_name, kinds, budget, timeline, notes, contact, design, element_count)
         values ('QT-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('quote_ref_seq')::text, 4, '0'), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         returning id, ref`,
        [user.id, currency, input.planId, input.planName, input.kinds, input.budget, input.timeline, input.notes, JSON.stringify(contact), design ? JSON.stringify(design) : null, design?.elements.length ?? 0],
      );
      const { id, ref } = r.rows[0]!;
      await q.query(`insert into quote_events (quote_id, actor_id, kind, to_status, body) values ($1, $2, 'status', 'submitted', 'Request received')`, [id, user.id]);
      const topic = input.planName || input.kinds.join(', ') || 'Quote request';
      await q.query('insert into conversations (client_id, quote_id, subject) values ($1, $2, $3)', [user.id, id, `${ref} · ${topic}`]);
      const admins = await activeIdsByRole(q, ['admin']);
      for (const a of admins) await addNotification(q, a, { kind: 'quote', title: `New request ${ref}`, body: `${user.fullName}${input.kinds.length ? ' · ' + input.kinds.join(', ') : ''}`, link: `/requests/${ref}` });
      await audit(q, { actorId: user.id, action: 'quote.create', entity: 'quote', entityId: id, meta: { ref }, ip });
      return { id, ref, admins };
    });

    this.n.push(made.admins, { type: 'quote', id: made.id });
    this.n.push(made.admins, { type: 'notification' });
    void this.n.email(user.email, emails.quoteReceived({ company: this.n.company, name: user.fullName, ref: made.ref, url: this.n.url(`/requests/${made.ref}`) }));
    void this.n.emailTeam(emails.newQuoteForStaff({ company: this.n.company, ref: made.ref, client: user.fullName, kinds: input.kinds.join(', '), url: this.n.url(`/requests/${made.ref}`) }));
    return this.getForClient(user.id, made.id);
  }

  /** Approve, decline or cancel: the moves that belong to the client. */
  async clientAct(user: PublicUser, idOrRef: string, action: ClientAction, note: string, ip = ''): Promise<QuoteRecord> {
    const rule = CLIENT_RULES[action];
    const cur = await this.db.query<{ id: string; ref: string; assigned_to: string | null; status: QuoteStatus }>(
      'select id, ref, assigned_to, status from quote_requests where (id::text = $1 or ref = $1) and client_id = $2',
      [idOrRef, user.id],
    );
    const row = cur.rows[0];
    if (!row) throw notFound('Request not found');

    const recipients = await this.db.tx(async (q) => {
      const upd = await q.query(
        `update quote_requests set status = $2, updated_at = now(),
                closed_at = case when $2 in ('declined', 'cancelled') then now() else closed_at end
          where id = $1 and status = any($3::text[])`,
        [row.id, rule.to, rule.from],
      );
      if (!upd.rowCount) throw badRequest(`This request is "${QUOTE_STATUS_LABEL[row.status]}", so it cannot be ${rule.verb} now.`);
      await q.query(`insert into quote_events (quote_id, actor_id, kind, from_status, to_status, body) values ($1, $2, 'status', $3, $4, $5)`, [row.id, user.id, row.status, rule.to, note || rule.text]);
      const ids = new Set(await activeIdsByRole(q, ['admin']));
      for (const id of ids) await addNotification(q, id, { kind: 'quote', title: `${user.fullName} ${rule.verb} ${row.ref}`, body: note, link: `/requests/${row.ref}` });
      await audit(q, { actorId: user.id, action: `quote.${action}`, entity: 'quote', entityId: row.id, ip });
      return [...ids];
    });

    this.n.push(recipients, { type: 'quote', id: row.id });
    this.n.push(recipients, { type: 'notification' });
    void this.n.emailTeam(emails.clientDecision({ company: this.n.company, ref: row.ref, client: user.fullName, decision: rule.verb, note, url: this.n.url(`/requests/${row.ref}`) }));
    return this.getForClient(user.id, row.id);
  }

  /* ---------- the team moves a request along ---------- */

  private async loadForStaff(q: Queryable, idOrRef: string): Promise<Row> {
    const r = await q.query('select id, ref, status, progress, client_id, offer_amount, assigned_to from quote_requests where id::text = $1 or ref = $1 for update', [idOrRef]);
    if (!r.rows[0]) throw notFound('Request not found');
    return r.rows[0];
  }

  /** Tells the client something changed: bell, live push, and (when `email` is given) an email too. */
  private async tellClient(row: Row, title: string, body: string, email?: (who: { name: string }) => ReturnType<typeof emails.quoteUpdate>): Promise<void> {
    await addNotification(this.db, row.client_id, { kind: 'quote', title, body, link: `/requests/${row.ref}` }, true);
    this.n.push([row.client_id], { type: 'quote', id: row.id });
    this.n.push([row.client_id], { type: 'notification' });
    if (email) {
      const u = await this.db.query<{ email: string; full_name: string }>('select email, full_name from users where id = $1', [row.client_id]);
      if (u.rows[0]) void this.n.email(u.rows[0].email, email({ name: u.rows[0].full_name }));
    }
  }

  async staffUpdate(actor: PublicUser, idOrRef: string, patch: z.output<typeof staffUpdateQuoteSchema>, ip = ''): Promise<QuoteRecord> {
    if (patch.status === undefined && patch.progress === undefined && patch.assignedTo === undefined) throw badRequest('Nothing to change.');

    const { row, notify, progressNote } = await this.db.tx(async (q) => {
      const cur = await this.loadForStaff(q, idOrRef);
      const next: QuoteStatus = patch.status ?? cur.status;
      let notify: { title: string; body: string; status: QuoteStatus } | null = null;
      let progressNote: string | null = null;

      if (patch.status !== undefined && patch.status !== cur.status) {
        if (!QUOTE_TRANSITIONS[cur.status as QuoteStatus].includes(patch.status)) {
          throw badRequest(`A request that is "${QUOTE_STATUS_LABEL[cur.status as QuoteStatus]}" cannot move to "${QUOTE_STATUS_LABEL[patch.status]}".`);
        }
        if (patch.status === 'quoted' && cur.offer_amount == null) throw badRequest('Send a quote offer first. It is what moves a request to "Quote ready".');
        const progress = patch.status === 'delivered' ? 100 : cur.progress;
        await q.query(
          `update quote_requests set status = $2, progress = $3, updated_at = now(),
             closed_at = case when $2 in ('delivered', 'declined', 'cancelled') then now() when $2 = 'reviewing' then null else closed_at end
           where id = $1`,
          [cur.id, patch.status, progress],
        );
        const onBehalf = patch.status === 'accepted' ? "Marked as approved on the client's behalf." : '';
        await q.query(`insert into quote_events (quote_id, actor_id, kind, from_status, to_status, body) values ($1, $2, 'status', $3, $4, $5)`, [cur.id, actor.id, cur.status, patch.status, patch.note || onBehalf]);
        notify = { title: `${cur.ref} is now "${QUOTE_STATUS_LABEL[patch.status]}"`, body: patch.note ?? '', status: patch.status };
      }

      if (patch.progress !== undefined) {
        if (next !== 'building') throw badRequest('Progress can be set while the request is "In build".');
        await q.query('update quote_requests set progress = $2, updated_at = now() where id = $1', [cur.id, patch.progress]);
        await q.query(`insert into quote_events (quote_id, actor_id, kind, progress, body) values ($1, $2, 'progress', $3, $4)`, [cur.id, actor.id, patch.progress, patch.note ?? '']);
        if (!notify) progressNote = `${patch.progress}% complete`;
      }

      if (patch.assignedTo !== undefined) {
        let name = 'nobody';
        if (patch.assignedTo) {
          const a = await q.query<{ full_name: string }>("select full_name from users where id = $1 and role = 'admin' and status = 'active'", [patch.assignedTo]);
          if (!a.rows[0]) throw badRequest('Choose an active Admin to own this request.');
          name = a.rows[0].full_name;
        }
        await q.query('update quote_requests set assigned_to = $2, updated_at = now() where id = $1', [cur.id, patch.assignedTo]);
        await q.query(`insert into quote_events (quote_id, actor_id, kind, body, visible_to_client) values ($1, $2, 'system', $3, false)`, [cur.id, actor.id, `Assigned to ${name}.`]);
        if (patch.assignedTo && patch.assignedTo !== actor.id) await addNotification(q, patch.assignedTo, { kind: 'quote', title: `${cur.ref} was assigned to you`, link: `/requests/${cur.ref}` });
      }
      await audit(q, { actorId: actor.id, action: 'quote.update', entity: 'quote', entityId: cur.id, meta: patch as Record<string, unknown>, ip });
      return { row: cur, notify, progressNote };
    });

    if (notify) {
      await this.tellClient(row, notify.title, notify.body, (who) =>
        emails.quoteUpdate({ company: this.n.company, name: who.name, ref: row.ref, status: QUOTE_STATUS_LABEL[notify.status], note: notify.body, url: this.n.url(`/requests/${row.ref}`) }),
      );
    } else if (progressNote) {
      await this.tellClient(row, `${row.ref}: ${progressNote}`, '');
    }
    if (patch.assignedTo) this.n.push([patch.assignedTo], { type: 'notification' });
    this.n.push(await activeIdsByRole(this.db, ['admin']), { type: 'quote', id: row.id });
    return this.getForStaff(row.id);
  }

  /** A note on the timeline. Visible ones reach the client; the default is team-only. */
  async addEvent(actor: PublicUser, idOrRef: string, input: z.output<typeof addEventSchema>, ip = ''): Promise<QuoteRecord> {
    const row = await this.db.tx(async (q) => {
      const cur = await this.loadForStaff(q, idOrRef);
      if (input.progress !== undefined) {
        if (cur.status !== 'building') throw badRequest('Progress can be set while the request is "In build".');
        await q.query('update quote_requests set progress = $2, updated_at = now() where id = $1', [cur.id, input.progress]);
      }
      await q.query(
        `insert into quote_events (quote_id, actor_id, kind, progress, body, visible_to_client) values ($1, $2, $3, $4, $5, $6)`,
        [cur.id, actor.id, input.progress !== undefined ? 'progress' : 'note', input.progress ?? null, input.body, input.visibleToClient],
      );
      await audit(q, { actorId: actor.id, action: 'quote.note', entity: 'quote', entityId: cur.id, meta: { visible: input.visibleToClient }, ip });
      return cur;
    });
    if (input.visibleToClient) await this.tellClient(row, `Update on ${row.ref}`, input.body.slice(0, 200));
    return this.getForStaff(row.id);
  }

  /** The fixed-price quote: stores it, moves the request to "Quote ready" and tells the client. Can be re-sent to revise. */
  async sendOffer(actor: PublicUser, idOrRef: string, input: z.output<typeof offerSchema>, ip = ''): Promise<QuoteRecord> {
    const amount = (Math.round(Number(input.amount) * 100) / 100).toFixed(2);
    const row = await this.db.tx(async (q) => {
      const cur = await this.loadForStaff(q, idOrRef);
      if (!['submitted', 'reviewing', 'quoted'].includes(cur.status)) throw badRequest(`A request that is "${QUOTE_STATUS_LABEL[cur.status as QuoteStatus]}" cannot get a new quote.`);
      await q.query(
        `update quote_requests set offer_amount = $2, offer_currency = $3, offer_summary = $4, offer_valid_until = $5, offer_sent_at = now(),
                status = 'quoted', updated_at = now(), closed_at = null where id = $1`,
        [cur.id, amount, input.currency, input.summary, input.validUntil ?? null],
      );
      await q.query(`insert into quote_events (quote_id, actor_id, kind, from_status, to_status, body) values ($1, $2, 'offer', $3, 'quoted', $4)`, [cur.id, actor.id, cur.status, `Quote sent: ${formatMoney(amount, input.currency)}`]);
      await audit(q, { actorId: actor.id, action: 'quote.offer', entity: 'quote', entityId: cur.id, meta: { amount, currency: input.currency }, ip });
      return cur;
    });
    const u = await this.db.query<{ email: string; full_name: string }>('select email, full_name from users where id = $1', [row.client_id]);
    await this.tellClient(row, `Your quote for ${row.ref} is ready`, `${formatMoney(amount, input.currency)}`);
    if (u.rows[0]) void this.n.email(u.rows[0].email, emails.quoteOffer({ company: this.n.company, name: u.rows[0].full_name, ref: row.ref, amount: formatMoney(amount, input.currency), url: this.n.url(`/requests/${row.ref}`) }));
    this.n.push(await activeIdsByRole(this.db, ['admin']), { type: 'quote', id: row.id });
    return this.getForStaff(row.id);
  }
}
