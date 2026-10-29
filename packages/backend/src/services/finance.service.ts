import {
  AGING_BUCKETS,
  DEFAULT_CURRENCY,
  formatMoney,
  isCurrency,
  type AgingBucket,
  type CurrencyCode,
  type FinanceSummary,
  type Invoice,
  type InvoiceDisplayStatus,
  type InvoiceSummary,
  type Payment,
  type PaymentMethod,
  type PublicUser,
} from '@coreloop/shared';
import type { z } from 'zod';
import type { invoiceSchema, paymentSchema } from '@coreloop/shared';
import { isoOf, isoOrNull, type Db, type Queryable, type Row } from '../db/types.js';
import { badRequest, notFound } from '../lib/http-error.js';
import { fromCents, money, toCents, todayIso } from '../lib/money.js';
import * as emails from './email-templates.js';
import type { MessagesService } from './messages.service.js';
import type { Notifier } from './notifier.js';
import { addNotification } from '../repos/notifications.repo.js';
import { audit } from '../repos/security.repo.js';
import { activeIdsByRole } from '../repos/users.repo.js';

/** One row per invoice with the client, the quote reference and what has been paid so far. */
const INV = `with inv as (
  select i.*, q.ref as quote_ref, u.full_name, u.email, u.company,
         coalesce((select sum(p.amount) from payments p where p.invoice_id = i.id), 0) as paid
    from invoices i join users u on u.id = i.client_id left join quote_requests q on q.id = i.quote_id
)`;

function displayStatus(r: Row, today: string): InvoiceDisplayStatus {
  if (r.status !== 'sent') return r.status;
  const balance = toCents(r.total) - toCents(r.paid);
  if (balance <= 0) return 'paid';
  if (String(r.due_on) < today) return 'overdue';
  return toCents(r.paid) > 0 ? 'partial' : 'sent';
}

function summary(r: Row, today: string): InvoiceSummary {
  return {
    id: r.id,
    number: r.number,
    status: r.status,
    displayStatus: displayStatus(r, today),
    currency: r.currency,
    client: { id: r.client_id, fullName: r.full_name, email: r.email, company: r.company },
    quoteId: r.quote_id ?? null,
    quoteRef: r.quote_ref ?? null,
    subtotal: money(r.subtotal),
    taxRate: money(r.tax_rate),
    tax: money(r.tax),
    total: money(r.total),
    paid: money(r.paid),
    balance: fromCents(toCents(r.total) - toCents(r.paid)),
    issuedOn: r.issued_on ?? null,
    dueOn: r.due_on,
    notes: r.notes,
    createdAt: isoOf(r.created_at),
    sentAt: isoOrNull(r.sent_at),
  };
}

function payment(r: Row): Payment {
  return {
    id: r.id,
    invoiceId: r.invoice_id,
    amount: money(r.amount),
    method: r.method as PaymentMethod,
    reference: r.reference,
    paidOn: r.paid_on,
    note: r.note,
    recordedBy: r.recorded_by ? { id: r.recorded_by, fullName: r.recorder_name } : null,
    createdAt: isoOf(r.created_at),
  };
}

/** Line, tax and total arithmetic in whole cents, so 0.1 + 0.2 never shows up on an invoice. */
function totals(items: { qty: number; unitPrice: number }[], taxRate: number): { lines: number[]; subtotal: number; tax: number; total: number } {
  const lines = items.map((i) => Math.round((Math.round(i.qty * 100) * Math.round(i.unitPrice * 100)) / 100));
  const subtotal = lines.reduce((a, b) => a + b, 0);
  const tax = Math.round((subtotal * Math.round(taxRate * 100)) / 10000);
  return { lines, subtotal, tax, total: subtotal + tax };
}

export interface InvoiceFilter {
  status?: string;
  clientId?: string;
  currency?: string;
  search?: string;
  limit?: number;
  offset?: number;
  /** A client's own view: hides drafts and other people's invoices. */
  onlyClient?: string;
}

const CSV_RISKY = /^[=+\-@\t\r]/;
const csvCell = (v: unknown): string => {
  let s = String(v ?? '');
  if (CSV_RISKY.test(s)) s = `'${s}`; // stops a spreadsheet from running "=cmd" typed into a client name
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export class FinanceService {
  constructor(
    private readonly db: Db,
    private readonly n: Notifier,
    private readonly messages: MessagesService,
  ) {}

  /* ---------- reading invoices ---------- */

  async list(f: InvoiceFilter): Promise<{ invoices: InvoiceSummary[]; total: number }> {
    const today = todayIso();
    const where: string[] = [];
    const vals: unknown[] = [];
    const param = (v: unknown): string => {
      vals.push(v);
      return `$${vals.length}`;
    };
    if (f.onlyClient) {
      where.push(`client_id = ${param(f.onlyClient)}`);
      where.push("status <> 'draft'");
    }
    if (f.clientId) where.push(`client_id = ${param(f.clientId)}`);
    if (f.currency) where.push(`currency = ${param(f.currency)}`);
    const balance = '(total - paid)';
    switch (f.status) {
      case 'draft':
      case 'void':
        where.push(`status = ${param(f.status)}`);
        break;
      case 'paid':
        where.push(`status = 'sent' and ${balance} <= 0`);
        break;
      case 'overdue':
        where.push(`status = 'sent' and ${balance} > 0 and due_on < ${param(today)}::date`);
        break;
      case 'partial':
        where.push(`status = 'sent' and paid > 0 and ${balance} > 0 and due_on >= ${param(today)}::date`);
        break;
      case 'sent':
        where.push(`status = 'sent' and paid = 0 and due_on >= ${param(today)}::date`);
        break;
      case 'open':
        where.push(`status = 'sent' and ${balance} > 0`);
        break;
      default:
    }
    if (f.search) {
      const p = param(`%${f.search.replace(/[%_\\]/g, '\\$&')}%`);
      where.push(`(number ilike ${p} or full_name ilike ${p} or email ilike ${p} or company ilike ${p})`);
    }
    const cond = where.length ? `where ${where.join(' and ')}` : '';
    const total = await this.db.query<{ n: number }>(`${INV} select count(*) as n from inv ${cond}`, vals);
    const rows = await this.db.query(`${INV} select * from inv ${cond} order by created_at desc limit ${Math.min(f.limit ?? 50, 200)} offset ${Math.max(f.offset ?? 0, 0)}`, vals);
    return { invoices: rows.rows.map((r) => summary(r, today)), total: total.rows[0]?.n ?? 0 };
  }

  async get(idOrNumber: string, viewer?: { clientId: string }): Promise<Invoice> {
    const today = todayIso();
    const vals: unknown[] = [idOrNumber];
    let extra = '';
    if (viewer) {
      vals.push(viewer.clientId);
      extra = "and client_id = $2 and status <> 'draft'";
    }
    const r = await this.db.query(`${INV} select * from inv where (id::text = $1 or number = $1) ${extra}`, vals);
    const row = r.rows[0];
    if (!row) throw notFound('Invoice not found');
    const items = await this.db.query('select description, qty, unit_price, amount from invoice_items where invoice_id = $1 order by position', [row.id]);
    const pays = await this.db.query('select p.*, u.full_name as recorder_name from payments p left join users u on u.id = p.recorded_by where p.invoice_id = $1 order by p.paid_on, p.id', [row.id]);
    return {
      ...summary(row, today),
      items: items.rows.map((i) => ({ description: i.description, qty: money(i.qty), unitPrice: money(i.unit_price), amount: money(i.amount) })),
      payments: pays.rows.map(payment),
    };
  }

  /* ---------- writing invoices ---------- */

  private async replaceItems(q: Queryable, invoiceId: string, input: z.output<typeof invoiceSchema>, calc: ReturnType<typeof totals>): Promise<void> {
    await q.query('delete from invoice_items where invoice_id = $1', [invoiceId]);
    for (let i = 0; i < input.items.length; i++) {
      const it = input.items[i]!;
      await q.query('insert into invoice_items (invoice_id, position, description, qty, unit_price, amount) values ($1, $2, $3, $4, $5, $6)', [
        invoiceId,
        i + 1,
        it.description,
        it.qty.toFixed(2),
        fromCents(Math.round(it.unitPrice * 100)),
        fromCents(calc.lines[i]!),
      ]);
    }
  }

  private async checkClientAndQuote(q: Queryable, clientId: string, quoteId?: string | null): Promise<void> {
    const c = await q.query("select 1 from users where id = $1 and role = 'client'", [clientId]);
    if (!c.rows[0]) throw badRequest('Choose one of your clients.');
    if (quoteId) {
      const r = await q.query('select 1 from quote_requests where id = $1 and client_id = $2', [quoteId, clientId]);
      if (!r.rows[0]) throw badRequest('That request does not belong to this client.');
    }
  }

  async create(actor: PublicUser, input: z.output<typeof invoiceSchema>, ip = ''): Promise<Invoice> {
    const calc = totals(input.items, input.taxRate);
    const id = await this.db.tx(async (q) => {
      await this.checkClientAndQuote(q, input.clientId, input.quoteId);
      const r = await q.query<{ id: string }>(
        `insert into invoices (number, client_id, quote_id, currency, subtotal, tax_rate, tax, total, issued_on, due_on, notes, created_by)
         values ('INV-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('invoice_seq')::text, 4, '0'), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) returning id`,
        [input.clientId, input.quoteId ?? null, input.currency, fromCents(calc.subtotal), input.taxRate.toFixed(2), fromCents(calc.tax), fromCents(calc.total), input.issuedOn ?? null, input.dueOn, input.notes, actor.id],
      );
      const invoiceId = r.rows[0]!.id;
      await this.replaceItems(q, invoiceId, input, calc);
      await audit(q, { actorId: actor.id, action: 'invoice.create', entity: 'invoice', entityId: invoiceId, meta: { total: fromCents(calc.total), currency: input.currency }, ip });
      return invoiceId;
    });
    return this.get(id);
  }

  /** Drafts can be edited freely. Once sent, an invoice is a record: void it and issue a new one instead. */
  async update(actor: PublicUser, idOrNumber: string, input: z.output<typeof invoiceSchema>, ip = ''): Promise<Invoice> {
    const calc = totals(input.items, input.taxRate);
    const id = await this.db.tx(async (q) => {
      const cur = await q.query('select id, status from invoices where id::text = $1 or number = $1 for update', [idOrNumber]);
      if (!cur.rows[0]) throw notFound('Invoice not found');
      if (cur.rows[0].status !== 'draft') throw badRequest('Only a draft can be edited. Void this invoice and create a new one.');
      await this.checkClientAndQuote(q, input.clientId, input.quoteId);
      await q.query(
        `update invoices set client_id = $2, quote_id = $3, currency = $4, subtotal = $5, tax_rate = $6, tax = $7, total = $8, issued_on = $9, due_on = $10, notes = $11 where id = $1`,
        [cur.rows[0].id, input.clientId, input.quoteId ?? null, input.currency, fromCents(calc.subtotal), input.taxRate.toFixed(2), fromCents(calc.tax), fromCents(calc.total), input.issuedOn ?? null, input.dueOn, input.notes],
      );
      await this.replaceItems(q, cur.rows[0].id, input, calc);
      await audit(q, { actorId: actor.id, action: 'invoice.update', entity: 'invoice', entityId: cur.rows[0].id, ip });
      return cur.rows[0].id as string;
    });
    return this.get(id);
  }

  async remove(actor: PublicUser, idOrNumber: string, ip = ''): Promise<void> {
    await this.db.tx(async (q) => {
      const cur = await q.query('select id, status, number from invoices where id::text = $1 or number = $1 for update', [idOrNumber]);
      if (!cur.rows[0]) throw notFound('Invoice not found');
      if (cur.rows[0].status !== 'draft') throw badRequest('Only a draft can be deleted. Void an invoice that was already sent.');
      await q.query('delete from invoices where id = $1', [cur.rows[0].id]);
      await audit(q, { actorId: actor.id, action: 'invoice.delete', entity: 'invoice', entityId: cur.rows[0].id, meta: { number: cur.rows[0].number }, ip });
    });
  }

  async send(actor: PublicUser, idOrNumber: string, ip = ''): Promise<Invoice> {
    const row = await this.db.tx(async (q) => {
      const cur = await q.query('select id, status, client_id, number from invoices where id::text = $1 or number = $1 for update', [idOrNumber]);
      const r = cur.rows[0];
      if (!r) throw notFound('Invoice not found');
      if (r.status !== 'draft') throw badRequest('This invoice was already sent.');
      await q.query("update invoices set status = 'sent', issued_on = coalesce(issued_on, $2::date), sent_at = now() where id = $1", [r.id, todayIso()]);
      await addNotification(q, r.client_id, { kind: 'invoice', title: `New invoice ${r.number}`, link: `/invoices/${r.id}` });
      await audit(q, { actorId: actor.id, action: 'invoice.send', entity: 'invoice', entityId: r.id, ip });
      return r;
    });
    const inv = await this.get(row.id);
    this.n.push([row.client_id], { type: 'invoice', id: row.id });
    this.n.push([row.client_id], { type: 'notification' });
    void this.n.email(inv.client.email ?? '', emails.invoiceSent({ company: this.n.company, name: inv.client.fullName, number: inv.number, total: formatMoney(inv.total, inv.currency), due: inv.dueOn, url: this.n.url(`/invoices/${inv.id}`) }));
    return inv;
  }

  async void(actor: PublicUser, idOrNumber: string, ip = ''): Promise<Invoice> {
    const id = await this.db.tx(async (q) => {
      const cur = await q.query('select i.id, i.status, coalesce((select sum(amount) from payments p where p.invoice_id = i.id), 0) as paid from invoices i where i.id::text = $1 or i.number = $1 for update', [idOrNumber]);
      const r = cur.rows[0];
      if (!r) throw notFound('Invoice not found');
      if (r.status === 'void') throw badRequest('This invoice is already void.');
      if (toCents(r.paid) > 0) throw badRequest('This invoice has payments recorded, so it cannot be voided.');
      await q.query("update invoices set status = 'void', voided_at = now() where id = $1", [r.id]);
      await audit(q, { actorId: actor.id, action: 'invoice.void', entity: 'invoice', entityId: r.id, ip });
      return r.id as string;
    });
    return this.get(id);
  }

  /* ---------- payments ---------- */

  async recordPayment(actor: PublicUser, idOrNumber: string, input: z.output<typeof paymentSchema>, ip = ''): Promise<Invoice> {
    const info = await this.db.tx(async (q) => {
      const cur = await q.query(
        `select i.id, i.number, i.status, i.total, i.currency, i.client_id, coalesce((select sum(amount) from payments p where p.invoice_id = i.id), 0) as paid
           from invoices i where i.id::text = $1 or i.number = $1 for update`,
        [idOrNumber],
      );
      const r = cur.rows[0];
      if (!r) throw notFound('Invoice not found');
      if (r.status !== 'sent') throw badRequest(r.status === 'draft' ? 'Send the invoice before recording payments.' : 'A void invoice cannot take payments.');
      const balance = toCents(r.total) - toCents(r.paid);
      const amount = toCents(input.amount);
      if (balance <= 0) throw badRequest('This invoice is already paid in full.');
      if (amount > balance) throw badRequest(`That is more than the ${formatMoney(fromCents(balance), r.currency)} still owed.`);
      await q.query('insert into payments (invoice_id, amount, method, reference, paid_on, note, recorded_by) values ($1, $2, $3, $4, $5, $6, $7)', [
        r.id,
        fromCents(amount),
        input.method,
        input.reference,
        input.paidOn ?? todayIso(),
        input.note,
        actor.id,
      ]);
      const left = balance - amount;
      await addNotification(q, r.client_id, { kind: 'invoice', title: `Payment received for ${r.number}`, body: formatMoney(fromCents(amount), r.currency), link: `/invoices/${r.id}` });
      await audit(q, { actorId: actor.id, action: 'payment.record', entity: 'invoice', entityId: r.id, meta: { amount: fromCents(amount), method: input.method, reference: input.reference }, ip });
      return { id: r.id as string, number: r.number as string, clientId: r.client_id as string, currency: r.currency as CurrencyCode, amount, left };
    });
    const inv = await this.get(info.id);
    const finance = await activeIdsByRole(this.db, ['admin', 'finance']);
    this.n.push([info.clientId, ...finance], { type: 'invoice', id: info.id });
    this.n.push([info.clientId], { type: 'notification' });
    void this.n.email(inv.client.email ?? '', emails.paymentReceived({ company: this.n.company, name: inv.client.fullName, number: info.number, amount: formatMoney(fromCents(info.amount), info.currency), balance: formatMoney(fromCents(info.left), info.currency), url: this.n.url(`/invoices/${info.id}`) }));
    return inv;
  }

  /** The payment ledger: newest first, across all invoices. */
  async payments(f: { currency?: string; limit?: number; offset?: number }): Promise<{ payments: (Payment & { invoiceNumber: string; currency: CurrencyCode; client: { id: string; fullName: string } })[]; total: number }> {
    const vals: unknown[] = [];
    const cond = f.currency ? (vals.push(f.currency), `where i.currency = $${vals.length}`) : '';
    const total = await this.db.query<{ n: number }>(`select count(*) as n from payments p join invoices i on i.id = p.invoice_id ${cond}`, vals);
    const rows = await this.db.query(
      `select p.*, i.number, i.currency, i.client_id, c.full_name, u.full_name as recorder_name
         from payments p join invoices i on i.id = p.invoice_id join users c on c.id = i.client_id left join users u on u.id = p.recorded_by
         ${cond} order by p.paid_on desc, p.id desc limit ${Math.min(f.limit ?? 100, 300)} offset ${Math.max(f.offset ?? 0, 0)}`,
      vals,
    );
    return {
      payments: rows.rows.map((r) => ({ ...payment(r), invoiceNumber: r.number, currency: r.currency, client: { id: r.client_id, fullName: r.full_name } })),
      total: total.rows[0]?.n ?? 0,
    };
  }

  /** A friendly nudge: a line in the client's chat, a bell entry and an email. */
  async remind(actor: PublicUser, idOrNumber: string, ip = ''): Promise<void> {
    const inv = await this.get(idOrNumber);
    if (inv.status !== 'sent' || toCents(inv.balance) <= 0) throw badRequest('Only an invoice with money still owed can be reminded.');
    const text = `Reminder: invoice ${inv.number} has ${formatMoney(inv.balance, inv.currency)} outstanding (due ${inv.dueOn}).`;
    await this.messages.postSystem(actor.id, inv.client.id, text);
    await addNotification(this.db, inv.client.id, { kind: 'invoice', title: `Reminder: ${inv.number}`, body: text, link: `/invoices/${inv.id}` }, true);
    this.n.push([inv.client.id], { type: 'notification' });
    void this.n.email(inv.client.email ?? '', emails.paymentReminder({ company: this.n.company, name: inv.client.fullName, number: inv.number, balance: formatMoney(inv.balance, inv.currency), due: inv.dueOn, url: this.n.url(`/invoices/${inv.id}`) }));
    await audit(this.db, { actorId: actor.id, action: 'invoice.remind', entity: 'invoice', entityId: inv.id, ip });
  }

  /* ---------- dashboard ---------- */

  async summary(currencyParam?: string): Promise<FinanceSummary> {
    const today = todayIso();
    const monthStart = `${today.slice(0, 7)}-01`;
    // A tab for every currency that has invoices, or approved work still waiting to be invoiced.
    const used = await this.db.query<{ currency: CurrencyCode }>(
      `select currency from (
         select currency, count(*) as n from invoices where status = 'sent' group by currency
         union all
         select coalesce(q.offer_currency, q.currency) as currency, 0 as n from quote_requests q
          where q.status in ('accepted', 'building', 'delivered')
            and not exists (select 1 from invoices i where i.quote_id = q.id and i.status <> 'void')
       ) t group by currency order by sum(n) desc, currency`,
    );
    const currencies = used.rows.map((r) => r.currency);
    const currency = (isCurrency(currencyParam) ? currencyParam : (currencies[0] ?? DEFAULT_CURRENCY)) as CurrencyCode;
    const one = async (sql: string, vals: unknown[]): Promise<Row> => (await this.db.query(sql, vals)).rows[0] ?? {};

    const invoiced = await one("select coalesce(sum(total), 0) as v from invoices where status = 'sent' and currency = $1 and issued_on >= $2::date and issued_on < ($2::date + interval '1 month')", [currency, monthStart]);
    const collected = await one(
      `select coalesce(sum(p.amount), 0) as v from payments p join invoices i on i.id = p.invoice_id
        where i.status = 'sent' and i.currency = $1 and p.paid_on >= $2::date and p.paid_on < ($2::date + interval '1 month')`,
      [currency, monthStart],
    );
    const open = await one(
      `${INV} select coalesce(sum(total - paid), 0) as outstanding,
              coalesce(sum(total - paid) filter (where due_on < $2::date), 0) as overdue,
              count(*) filter (where due_on < $2::date) as overdue_count
         from inv where status = 'sent' and currency = $1 and total - paid > 0`,
      [currency, today],
    );
    const pay = await one(
      `${INV}, last as (select invoice_id, max(paid_on) as d from payments group by invoice_id)
       select avg(last.d - inv.issued_on) as days from inv join last on last.invoice_id = inv.id
        where inv.status = 'sent' and inv.currency = $1 and inv.total - inv.paid <= 0 and inv.issued_on is not null and last.d >= ($2::date - interval '365 days')`,
      [currency, today],
    );

    const monthly = await this.db.query(
      `select to_char(m, 'YYYY-MM') as month,
              coalesce((select sum(i.total) from invoices i where i.status = 'sent' and i.currency = $1 and date_trunc('month', i.issued_on) = m), 0) as invoiced,
              coalesce((select sum(p.amount) from payments p join invoices i on i.id = p.invoice_id where i.status = 'sent' and i.currency = $1 and date_trunc('month', p.paid_on) = m), 0) as collected
         from generate_series(date_trunc('month', $2::date) - interval '11 months', date_trunc('month', $2::date), interval '1 month') m order by m`,
      [currency, today],
    );

    const aging = await this.db.query(
      `${INV} select case when $2::date - due_on <= 0 then 'current' when $2::date - due_on <= 30 then '1-30'
                          when $2::date - due_on <= 60 then '31-60' when $2::date - due_on <= 90 then '61-90' else '90+' end as bucket,
                     sum(total - paid) as amount, count(*) as n
                from inv where status = 'sent' and currency = $1 and total - paid > 0 group by 1`,
      [currency, today],
    );
    const agingMap = new Map(aging.rows.map((r) => [r.bucket as AgingBucket, r]));

    const top = await this.db.query(
      `${INV} select client_id, full_name, email, company, sum(total) as invoiced, sum(paid) as paid from inv
        where status = 'sent' and currency = $1 and issued_on >= ($2::date - interval '12 months')
        group by client_id, full_name, email, company order by sum(total) desc limit 5`,
      [currency, today],
    );

    const overdue = await this.db.query(`${INV} select * from inv where status = 'sent' and currency = $1 and total - paid > 0 and due_on < $2::date order by due_on limit 8`, [currency, today]);
    const soon = await this.db.query(`${INV} select * from inv where status = 'sent' and currency = $1 and total - paid > 0 and due_on >= $2::date and due_on <= ($2::date + interval '7 days') order by due_on limit 8`, [currency, today]);
    const waiting = await this.db.query(
      `select q.id, q.ref, q.offer_amount, coalesce(q.offer_currency, q.currency) as cur, c.id as client_id, c.full_name, c.email, c.company
         from quote_requests q join users c on c.id = q.client_id
        where q.status in ('accepted', 'building', 'delivered') and coalesce(q.offer_currency, q.currency) = $1
          and not exists (select 1 from invoices i where i.quote_id = q.id and i.status <> 'void')
        order by q.updated_at desc limit 8`,
      [currency],
    );

    return {
      currency,
      currencies,
      kpis: {
        invoicedThisMonth: money(invoiced.v),
        collectedThisMonth: money(collected.v),
        outstanding: money(open.outstanding ?? 0),
        overdueAmount: money(open.overdue ?? 0),
        overdueCount: Number(open.overdue_count ?? 0),
        avgDaysToPay: pay.days == null ? null : Math.round(Number(pay.days) * 10) / 10,
      },
      monthly: monthly.rows.map((r) => ({ month: r.month, invoiced: money(r.invoiced), collected: money(r.collected) })),
      aging: AGING_BUCKETS.map((bucket) => ({ bucket, amount: money(agingMap.get(bucket)?.amount ?? 0), count: Number(agingMap.get(bucket)?.n ?? 0) })),
      topClients: top.rows.map((r) => ({ client: { id: r.client_id, fullName: r.full_name, email: r.email, company: r.company }, invoiced: money(r.invoiced), paid: money(r.paid) })),
      attention: {
        overdue: overdue.rows.map((r) => summary(r, today)),
        dueSoon: soon.rows.map((r) => summary(r, today)),
        acceptedWithoutInvoice: waiting.rows.map((r) => ({ id: r.id, ref: r.ref, client: { id: r.client_id, fullName: r.full_name, email: r.email, company: r.company }, amount: r.offer_amount == null ? null : money(r.offer_amount), currency: r.cur })),
      },
    };
  }

  /** Who owes what, per client and currency. */
  async balances(): Promise<{ client: { id: string; fullName: string; email: string; company: string }; currency: CurrencyCode; invoices: number; invoiced: string; paid: string; outstanding: string; overdue: string }[]> {
    const today = todayIso();
    const r = await this.db.query(
      `${INV} select client_id, full_name, email, company, currency, count(*) as n, sum(total) as invoiced, sum(paid) as paid,
              coalesce(sum(total - paid) filter (where total - paid > 0), 0) as outstanding,
              coalesce(sum(total - paid) filter (where total - paid > 0 and due_on < $1::date), 0) as overdue
         from inv where status = 'sent' group by client_id, full_name, email, company, currency order by outstanding desc, full_name`,
      [today],
    );
    return r.rows.map((x) => ({ client: { id: x.client_id, fullName: x.full_name, email: x.email, company: x.company }, currency: x.currency, invoices: Number(x.n), invoiced: money(x.invoiced), paid: money(x.paid), outstanding: money(x.outstanding), overdue: money(x.overdue) }));
  }

  /** Every invoice as a CSV a spreadsheet can open. */
  async exportCsv(f: InvoiceFilter): Promise<string> {
    const { invoices } = await this.list({ ...f, limit: 200, offset: 0 });
    const head = ['Number', 'Status', 'Client', 'Company', 'Email', 'Currency', 'Subtotal', 'Tax', 'Total', 'Paid', 'Balance', 'Issued', 'Due', 'Request'];
    const rows = invoices.map((i) => [i.number, i.displayStatus, i.client.fullName, i.client.company ?? '', i.client.email ?? '', i.currency, i.subtotal, i.tax, i.total, i.paid, i.balance, i.issuedOn ?? '', i.dueOn, i.quoteRef ?? '']);
    return [head, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
  }
}
