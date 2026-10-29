import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { anon, boot, signedInAs, type Harness } from './support/harness.js';

let h: Harness;
let admin: Awaited<ReturnType<typeof signedInAs>>;
let finance: Awaited<ReturnType<typeof signedInAs>>;
let ana: Awaited<ReturnType<typeof signedInAs>>;
let ben: Awaited<ReturnType<typeof signedInAs>>;
let quote: { id: string; ref: string };

beforeAll(async () => {
  h = await boot();
  admin = await signedInAs(h, { role: 'admin', email: 'admin@example.com' });
  finance = await signedInAs(h, { role: 'finance', email: 'fin@example.com', fullName: 'Fin Ance' });
  ana = await signedInAs(h, { email: 'ana@example.com', fullName: 'Ana Client', currency: 'PHP' });
  ben = await signedInAs(h, { email: 'ben@example.com', fullName: 'Ben Client', currency: 'USD' });

  // Ana's request, taken all the way to "approved"
  const made = await ana.agent.post('/api/quotes').send({ name: 'Ana', company: '', email: 'ana@example.com', phone: '', planId: null, planName: null, kinds: ['Dashboard'], budget: '', timeline: '', notes: 'x', design: null });
  quote = { id: made.body.quote.id, ref: made.body.quote.ref };
  await admin.agent.patch(`/api/admin/quotes/${quote.ref}`).send({ status: 'reviewing' }).expect(200);
  await admin.agent.post(`/api/admin/quotes/${quote.ref}/offer`).send({ amount: 2750, currency: 'PHP', summary: 'Dashboard' }).expect(200);
  await ana.agent.post(`/api/quotes/${quote.ref}/approve`).send({}).expect(200);
});
afterAll(async () => {
  await h.close();
});

const today = new Date().toISOString().slice(0, 10);
const inDays = (n: number): string => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

function draft(over: Record<string, unknown> = {}) {
  return {
    clientId: ana.user.id,
    quoteId: quote.id,
    currency: 'PHP',
    items: [
      { description: 'Design sprint', qty: 1, unitPrice: 2400 },
      { description: 'Hosting, per month', qty: 2.5, unitPrice: 19.99 },
    ],
    taxRate: 12,
    dueOn: inDays(14),
    notes: 'Thank you.',
    ...over,
  };
}

describe('access', () => {
  it('is for Finance and Admin only', async () => {
    expect((await ana.agent.get('/api/finance/summary')).status).toBe(403);
    expect((await anon(h).get('/api/finance/invoices')).status).toBe(401);
    expect((await finance.agent.get('/api/finance/summary')).status).toBe(200);
    expect((await admin.agent.get('/api/finance/summary')).status).toBe(200);
    expect((await finance.agent.get('/api/admin/users')).status).toBe(403);
  });
});

describe('invoices', () => {
  let invoice: { id: string; number: string };

  it('shows Finance what is waiting to be invoiced, then adds up the lines in whole cents', async () => {
    const before = await finance.agent.get('/api/finance/summary').query({ currency: 'PHP' });
    expect(before.body.summary.attention.acceptedWithoutInvoice.map((x: { ref: string }) => x.ref)).toContain(quote.ref);

    const res = await finance.agent.post('/api/finance/invoices').send(draft());
    expect(res.status).toBe(201);
    invoice = res.body.invoice;
    expect(res.body.invoice).toMatchObject({ status: 'draft', displayStatus: 'draft', currency: 'PHP', subtotal: '2449.98', tax: '294.00', total: '2743.98', paid: '0.00', balance: '2743.98', quoteRef: quote.ref });
    expect(res.body.invoice.number).toMatch(/^INV-\d{4}-\d{4}$/);
    expect(res.body.invoice.items).toHaveLength(2);
    expect(res.body.invoice.items[1]).toMatchObject({ qty: '2.50', unitPrice: '19.99', amount: '49.98' });

    const after = await finance.agent.get('/api/finance/summary').query({ currency: 'PHP' });
    expect(after.body.summary.attention.acceptedWithoutInvoice.map((x: { ref: string }) => x.ref)).not.toContain(quote.ref);
  });

  it('hides drafts from the client until they are sent', async () => {
    expect((await ana.agent.get('/api/invoices')).body.invoices).toHaveLength(0);
    expect((await ana.agent.get(`/api/invoices/${invoice.id}`)).status).toBe(404);
    const sent = await finance.agent.post(`/api/finance/invoices/${invoice.id}/send`).send({});
    expect(sent.body.invoice).toMatchObject({ status: 'sent', displayStatus: 'sent', issuedOn: today });
    expect((await ana.agent.get('/api/invoices')).body.invoices.map((i: { number: string }) => i.number)).toEqual([invoice.number]);
    expect((await ana.agent.get(`/api/invoices/${invoice.number}`)).status).toBe(200);
    expect(h.mailer.to('ana@example.com').some((m) => m.subject.includes(invoice.number))).toBe(true);
    const bell = await ana.agent.get('/api/notifications');
    expect(bell.body.items.some((n: { title: string }) => n.title.includes(invoice.number))).toBe(true);
    // someone else's invoice looks like it does not exist
    expect((await ben.agent.get(`/api/invoices/${invoice.id}`)).status).toBe(404);
    expect((await finance.agent.post(`/api/finance/invoices/${invoice.id}/send`).send({})).status).toBe(400); // only once
  });

  it('takes partial payments, refuses overpayment, and settles', async () => {
    const part = await finance.agent.post(`/api/finance/invoices/${invoice.id}/payments`).send({ amount: 1000, method: 'bank_transfer', reference: 'BDO-8841' });
    expect(part.status).toBe(201);
    expect(part.body.invoice).toMatchObject({ displayStatus: 'partial', paid: '1000.00', balance: '1743.98' });
    expect(part.body.invoice.payments[0]).toMatchObject({ method: 'bank_transfer', reference: 'BDO-8841', amount: '1000.00', paidOn: today });
    expect(part.body.invoice.payments[0].recordedBy.fullName).toBe('Fin Ance');

    const over = await finance.agent.post(`/api/finance/invoices/${invoice.id}/payments`).send({ amount: 2000, method: 'cash' });
    expect(over.status).toBe(400);
    expect(over.body.error).toMatch(/more than/);
    expect((await finance.agent.post(`/api/finance/invoices/${invoice.id}/payments`).send({ amount: 0, method: 'cash' })).status).toBe(400);
    expect((await finance.agent.post(`/api/finance/invoices/${invoice.id}/payments`).send({ amount: 10, method: 'bitcoin' })).status).toBe(400);

    const rest = await finance.agent.post(`/api/finance/invoices/${invoice.id}/payments`).send({ amount: 1743.98, method: 'cash', paidOn: today });
    expect(rest.body.invoice).toMatchObject({ displayStatus: 'paid', balance: '0.00' });
    expect((await finance.agent.post(`/api/finance/invoices/${invoice.id}/payments`).send({ amount: 1, method: 'cash' })).status).toBe(400);
    expect((await ana.agent.get(`/api/invoices/${invoice.id}`)).body.invoice.displayStatus).toBe('paid');
  });

  it('keeps sent invoices as records: no editing, no deleting, no voiding once paid', async () => {
    expect((await finance.agent.put(`/api/finance/invoices/${invoice.id}`).send(draft())).status).toBe(400);
    expect((await finance.agent.delete(`/api/finance/invoices/${invoice.id}`)).status).toBe(400);
    const v = await finance.agent.post(`/api/finance/invoices/${invoice.id}/void`).send({});
    expect(v.status).toBe(400);
    expect(v.body.error).toMatch(/payments/);
  });

  it('lets a draft be edited and deleted, and an unpaid sent invoice be voided', async () => {
    const d = (await finance.agent.post('/api/finance/invoices').send(draft({ quoteId: null, items: [{ description: 'Workshop', qty: 1, unitPrice: 500 }], taxRate: 0 }))).body.invoice;
    const edited = await finance.agent.put(`/api/finance/invoices/${d.id}`).send(draft({ quoteId: null, items: [{ description: 'Workshop', qty: 2, unitPrice: 500 }], taxRate: 0 }));
    expect(edited.body.invoice.total).toBe('1000.00');
    expect((await finance.agent.delete(`/api/finance/invoices/${d.id}`)).status).toBe(200);
    expect((await finance.agent.get(`/api/finance/invoices/${d.id}`)).status).toBe(404);

    const s = (await finance.agent.post('/api/finance/invoices').send(draft({ quoteId: null, taxRate: 0 }))).body.invoice;
    await finance.agent.post(`/api/finance/invoices/${s.id}/send`).send({}).expect(200);
    const voided = await finance.agent.post(`/api/finance/invoices/${s.id}/void`).send({});
    expect(voided.body.invoice.displayStatus).toBe('void');
    expect((await finance.agent.post(`/api/finance/invoices/${s.id}/payments`).send({ amount: 5, method: 'cash' })).status).toBe(400);
  });

  it('validates the invoice itself', async () => {
    expect((await finance.agent.post('/api/finance/invoices').send(draft({ items: [] }))).status).toBe(400);
    expect((await finance.agent.post('/api/finance/invoices').send(draft({ currency: 'XXX' }))).status).toBe(400);
    expect((await finance.agent.post('/api/finance/invoices').send(draft({ clientId: admin.user.id }))).status).toBe(400); // not a client
    expect((await finance.agent.post('/api/finance/invoices').send(draft({ quoteId: '00000000-0000-4000-8000-000000000000' }))).status).toBe(400);
    expect((await finance.agent.post('/api/finance/invoices').send(draft({ dueOn: 'next week' }))).status).toBe(400);
  });
});

describe('dashboard', () => {
  it('keeps every currency apart and flags what is overdue', async () => {
    // USD for Ben (overdue), EUR for Ana (not due yet)
    const usd = (await finance.agent.post('/api/finance/invoices').send({ clientId: ben.user.id, currency: 'USD', items: [{ description: 'Support', qty: 1, unitPrice: 900 }], taxRate: 0, dueOn: '2020-01-31' })).body.invoice;
    await finance.agent.post(`/api/finance/invoices/${usd.id}/send`).send({}).expect(200);
    const eur = (await finance.agent.post('/api/finance/invoices').send({ clientId: ana.user.id, currency: 'EUR', items: [{ description: 'Licence', qty: 1, unitPrice: 300 }], taxRate: 0, dueOn: inDays(5) })).body.invoice;
    await finance.agent.post(`/api/finance/invoices/${eur.id}/send`).send({}).expect(200);

    const all = (await finance.agent.get('/api/finance/summary')).body.summary;
    expect([...all.currencies].sort()).toEqual(['EUR', 'PHP', 'USD']);

    const u = (await finance.agent.get('/api/finance/summary').query({ currency: 'USD' })).body.summary;
    expect(u.currency).toBe('USD');
    expect(u.kpis).toMatchObject({ outstanding: '900.00', overdueAmount: '900.00', overdueCount: 1 });
    expect(u.aging.find((a: { bucket: string }) => a.bucket === '90+')).toMatchObject({ amount: '900.00', count: 1 });
    expect(u.attention.overdue[0]).toMatchObject({ number: usd.number, displayStatus: 'overdue' });

    const e = (await finance.agent.get('/api/finance/summary').query({ currency: 'EUR' })).body.summary;
    expect(e.kpis).toMatchObject({ outstanding: '300.00', overdueAmount: '0.00', overdueCount: 0, invoicedThisMonth: '300.00' });
    expect(e.attention.dueSoon.map((i: { number: string }) => i.number)).toEqual([eur.number]);

    const p = (await finance.agent.get('/api/finance/summary').query({ currency: 'PHP' })).body.summary;
    expect(p.kpis.outstanding).toBe('0.00'); // the PHP invoice was paid in full
    expect(p.kpis.collectedThisMonth).toBe('2743.98');
    expect(p.kpis.avgDaysToPay).toBe(0);
    expect(p.monthly).toHaveLength(12);
    expect(p.monthly.at(-1)).toMatchObject({ month: today.slice(0, 7), invoiced: '2743.98', collected: '2743.98' });
    expect(p.topClients[0]).toMatchObject({ invoiced: '2743.98', paid: '2743.98' });
    expect(p.topClients[0].client.fullName).toBe('Ana Client');
  });

  it('filters the invoice list by derived status and client', async () => {
    const overdue = await finance.agent.get('/api/finance/invoices').query({ status: 'overdue' });
    expect(overdue.body.invoices.every((i: { displayStatus: string }) => i.displayStatus === 'overdue')).toBe(true);
    expect(overdue.body.total).toBe(1);
    const paid = await finance.agent.get('/api/finance/invoices').query({ status: 'paid' });
    expect(paid.body.total).toBe(1);
    const bens = await finance.agent.get('/api/finance/invoices').query({ clientId: ben.user.id });
    expect(bens.body.invoices.every((i: { client: { id: string } }) => i.client.id === ben.user.id)).toBe(true);
    const open = await finance.agent.get('/api/finance/invoices').query({ status: 'open' });
    expect(open.body.total).toBe(2);
  });

  it('lists payments, balances per client and currency, and exports a safe CSV', async () => {
    const pays = await finance.agent.get('/api/finance/payments');
    expect(pays.body.total).toBe(2);
    expect(pays.body.payments[0]).toMatchObject({ currency: 'PHP', client: { fullName: 'Ana Client' } });

    const bal = (await finance.agent.get('/api/finance/balances')).body.balances;
    const ben$ = bal.find((b: { client: { fullName: string }; currency: string }) => b.client.fullName === 'Ben Client' && b.currency === 'USD');
    expect(ben$).toMatchObject({ outstanding: '900.00', overdue: '900.00' });

    const sneaky = await signedInAs(h, { email: 'sneaky@example.com', fullName: '=HYPERLINK("http://evil.example")' });
    const x = (await finance.agent.post('/api/finance/invoices').send({ clientId: sneaky.user.id, currency: 'USD', items: [{ description: 'x', qty: 1, unitPrice: 1 }], taxRate: 0, dueOn: inDays(3) })).body.invoice;
    await finance.agent.post(`/api/finance/invoices/${x.id}/send`).send({}).expect(200);
    const csv = await finance.agent.get('/api/finance/export.csv');
    expect(csv.headers['content-type']).toMatch(/text\/csv/);
    expect(csv.headers['content-disposition']).toMatch(/attachment/);
    const lines = csv.text.trim().split('\r\n');
    expect(lines[0]).toBe('Number,Status,Client,Company,Email,Currency,Subtotal,Tax,Total,Paid,Balance,Issued,Due,Request');
    expect(csv.text).toContain(`"'=HYPERLINK(""http://evil.example"")"`);
    expect(csv.text).not.toMatch(/,=HYPERLINK/);
  });

  it('sends a payment reminder into the client\'s chat, bell and email', async () => {
    const list = (await finance.agent.get('/api/finance/invoices').query({ status: 'overdue' })).body.invoices;
    const target = list[0];
    await finance.agent.post(`/api/finance/invoices/${target.id}/remind`).send({}).expect(200);
    const convs = (await ben.agent.get('/api/conversations')).body.conversations;
    expect(convs[0].lastMessagePreview).toMatch(/Reminder: invoice/);
    expect(convs[0].unread).toBe(1);
    const thread = (await ben.agent.get(`/api/conversations/${convs[0].id}/messages`)).body.messages;
    expect(thread.at(-1)).toMatchObject({ system: true });
    expect(h.mailer.to('ben@example.com').some((m) => m.subject.startsWith('Reminder'))).toBe(true);
    // a paid invoice needs no reminder
    const paid = (await finance.agent.get('/api/finance/invoices').query({ status: 'paid' })).body.invoices[0];
    expect((await finance.agent.post(`/api/finance/invoices/${paid.id}/remind`).send({})).status).toBe(400);
  });

  it('writes the audit trail for money moves', async () => {
    const log = (await admin.agent.get('/api/admin/audit')).body.entries.map((e: { action: string }) => e.action);
    expect(log).toEqual(expect.arrayContaining(['invoice.create', 'invoice.send', 'payment.record', 'invoice.void', 'quote.offer']));
  });
});
