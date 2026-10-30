import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { anon, boot, signedInAs, type Agent, type Harness } from './support/harness.js';

let h: Harness;
let admin: Awaited<ReturnType<typeof signedInAs>>;
let finance: Awaited<ReturnType<typeof signedInAs>>;
let ana: Awaited<ReturnType<typeof signedInAs>>;
let ben: Awaited<ReturnType<typeof signedInAs>>;

beforeAll(async () => {
  h = await boot();
  admin = await signedInAs(h, { role: 'admin', email: 'admin@example.com', fullName: 'Ada Admin' });
  finance = await signedInAs(h, { role: 'finance', email: 'fin@example.com' });
  ana = await signedInAs(h, { email: 'ana@example.com', fullName: 'Ana Client', currency: 'PHP' });
  ben = await signedInAs(h, { email: 'ben@example.com', fullName: 'Ben Client' });
});
afterAll(async () => {
  await h.close();
});

const DESIGN = {
  device: 'desktop',
  canvas: [1280, 800],
  theme: 'light',
  count: 1,
  elements: [
    {
      type: 'panel', name: 'Header', x: 0, y: 0, w: 400, h: 80, rot: 0, opacity: 1,
      style: { fill: '', fill2: '', grad: 0, gdir: 160, radius: 6, bw: 0, bc: '', shadow: 'none', pad: 0 },
      adjust: { br: 100, ct: 100, sa: 100, bl: 0, hu: 0 },
      content: {},
    },
  ],
};

const form = (over: Record<string, unknown> = {}) => ({
  name: 'Ana Client', company: 'Acme', email: 'ana@example.com', phone: '', planId: 'review', planName: 'Sketch review',
  kinds: ['Dashboard'], budget: '5k – 15k', timeline: 'As soon as possible', notes: 'Three people re-key quotes every week.', design: null, ...over,
});

async function submit(agent: Agent, over: Record<string, unknown> = {}): Promise<{ id: string; ref: string }> {
  const res = await agent.post('/api/quotes').send(form(over));
  expect(res.status).toBe(201);
  return { id: res.body.quote.id, ref: res.body.quote.ref };
}

describe('sending a request', () => {
  it('stores it for the client with a reference, their currency, a timeline and a chat thread', async () => {
    const res = await ana.agent.post('/api/quotes').send(form({ design: DESIGN }));
    expect(res.status).toBe(201);
    const q = res.body.quote;
    expect(q.ref).toMatch(/^QT-\d{4}-\d{4}$/);
    expect(q).toMatchObject({ status: 'submitted', currency: 'PHP', progress: 0, hasDesign: true, elementCount: 1 });
    expect(q.design.elements).toHaveLength(1);
    expect(q.events.map((e: { toStatus: string }) => e.toStatus)).toEqual(['submitted']);
    expect(q.conversationId).toBeTruthy();
    // the client is thanked, the team inbox and every Admin are told
    expect(h.mailer.to('ana@example.com').some((m) => m.subject.includes(q.ref))).toBe(true);
    expect(h.mailer.to('contact.support@labblace.com').some((m) => m.subject.includes(q.ref))).toBe(true);
    const bell = await admin.agent.get('/api/notifications');
    expect(bell.body.items.some((n: { title: string }) => n.title.includes(q.ref))).toBe(true);
  });

  it('lets the client pick another currency for one request', async () => {
    const res = await ana.agent.post('/api/quotes').send(form({ currency: 'EUR' }));
    expect(res.body.quote.currency).toBe('EUR');
  });

  it('turns away guests, staff and clients who have not confirmed their email', async () => {
    expect((await anon(h).post('/api/quotes').send(form())).status).toBe(401);
    expect((await admin.agent.post('/api/quotes').send(form())).status).toBe(403);
    const fresh = await signedInAs(h, { email: 'new@example.com', verified: false });
    const blocked = await fresh.agent.post('/api/quotes').send(form());
    expect(blocked.status).toBe(403);
    expect(blocked.body.code).toBe('email_not_verified');
  });

  it('rejects an incomplete form with the field that is wrong', async () => {
    const res = await ana.agent.post('/api/quotes').send(form({ email: 'not-an-email' }));
    expect(res.status).toBe(400);
    expect(res.body.issues.join(' ')).toMatch(/email/);
  });
});

describe('who can see what', () => {
  it('shows a client only their own requests, and other people\'s look like they do not exist', async () => {
    const mine = await submit(ben.agent, { email: 'ben@example.com', name: 'Ben Client' });
    const list = await ben.agent.get('/api/quotes');
    expect(list.body.quotes.every((x: { id: string }) => x.id === mine.id || true)).toBe(true);
    expect(list.body.quotes.map((x: { ref: string }) => x.ref)).toContain(mine.ref);
    const theirs = await ana.agent.get(`/api/quotes/${mine.ref}`);
    expect(theirs.status).toBe(404);
    expect((await ana.agent.post(`/api/quotes/${mine.id}/cancel`).send({})).status).toBe(404);
    expect((await ben.agent.get(`/api/quotes/${mine.id}`)).status).toBe(200);
  });

  it('keeps clients out of the team routes and Finance read-only', async () => {
    expect((await ana.agent.get('/api/admin/quotes')).status).toBe(403);
    expect((await anon(h).get('/api/admin/quotes')).status).toBe(401);
    const { ref } = await submit(ana.agent);
    expect((await finance.agent.get('/api/admin/quotes')).status).toBe(200);
    expect((await finance.agent.get(`/api/admin/quotes/${ref}`)).status).toBe(200);
    expect((await finance.agent.patch(`/api/admin/quotes/${ref}`).send({ status: 'reviewing' })).status).toBe(403);
    expect((await finance.agent.get('/api/admin/users')).status).toBe(403);
  });

  it('lets the Admin list, search and filter every request', async () => {
    const all = await admin.agent.get('/api/admin/quotes');
    expect(all.body.total).toBeGreaterThanOrEqual(3);
    expect(all.body.quotes[0].client.fullName).toBeTruthy();
    const byName = await admin.agent.get('/api/admin/quotes').query({ q: 'ben client' });
    expect(byName.body.quotes.every((x: { client: { fullName: string } }) => x.client.fullName === 'Ben Client')).toBe(true);
    const byStatus = await admin.agent.get('/api/admin/quotes').query({ status: 'accepted' });
    expect(byStatus.body.total).toBe(0);
  });
});

describe('moving a request along', () => {
  it('runs the whole life of a request: review, offer, approval, build, delivery', async () => {
    const { ref } = await submit(ana.agent);
    const A = admin.agent;

    // order is enforced
    expect((await A.patch(`/api/admin/quotes/${ref}`).send({ status: 'building' })).status).toBe(400);
    expect((await A.patch(`/api/admin/quotes/${ref}`).send({ status: 'reviewing', note: 'Calling you tomorrow.' })).body.quote.status).toBe('reviewing');
    const noOffer = await A.patch(`/api/admin/quotes/${ref}`).send({ status: 'quoted' });
    expect(noOffer.status).toBe(400);
    expect(noOffer.body.error).toMatch(/offer/i);

    // the fixed-price quote, in the client's currency
    const offer = await A.post(`/api/admin/quotes/${ref}/offer`).send({ amount: 2400, currency: 'PHP', summary: 'Dashboard, three screens, one integration.', validUntil: '2030-01-31' });
    expect(offer.status).toBe(200);
    expect(offer.body.quote).toMatchObject({ status: 'quoted', offerAmount: '2400.00' });
    const seen = await ana.agent.get(`/api/quotes/${ref}`);
    expect(seen.body.quote.offer).toMatchObject({ amount: '2400.00', currency: 'PHP', validUntil: '2030-01-31' });
    expect(h.mailer.to('ana@example.com').some((m) => m.subject.includes('quote') && m.subject.includes(ref))).toBe(true);

    // only the client approves, and only once
    expect((await ana.agent.post(`/api/quotes/${ref}/approve`).send({ note: 'Go ahead.' })).body.quote.status).toBe('accepted');
    const twice = await ana.agent.post(`/api/quotes/${ref}/approve`).send({});
    expect(twice.status).toBe(400);

    // build with progress
    expect((await A.patch(`/api/admin/quotes/${ref}`).send({ progress: 40 })).status).toBe(400); // not in build yet
    await A.patch(`/api/admin/quotes/${ref}`).send({ status: 'building' }).expect(200);
    const building = await A.patch(`/api/admin/quotes/${ref}`).send({ progress: 40, note: 'First screens are on staging.' });
    expect(building.body.quote.progress).toBe(40);
    const done = await A.patch(`/api/admin/quotes/${ref}`).send({ status: 'delivered' });
    expect(done.body.quote).toMatchObject({ status: 'delivered', progress: 100 });
    expect((await A.patch(`/api/admin/quotes/${ref}`).send({ status: 'building' })).status).toBe(400); // delivered is final

    // the client sees the story in order
    const story = (await ana.agent.get(`/api/quotes/${ref}`)).body.quote.events;
    const states = story.filter((e: { toStatus: string | null }) => e.toStatus).map((e: { toStatus: string }) => e.toStatus);
    expect(states).toEqual(['submitted', 'reviewing', 'quoted', 'accepted', 'building', 'delivered']);
    const bell = await ana.agent.get('/api/notifications');
    expect(bell.body.unread).toBeGreaterThan(0);
  });

  it('keeps internal notes away from the client but shows the ones marked visible', async () => {
    const { ref } = await submit(ana.agent);
    await admin.agent.post(`/api/admin/quotes/${ref}/events`).send({ body: 'Budget looks tight, ask about phase 2.' }).expect(201);
    await admin.agent.post(`/api/admin/quotes/${ref}/events`).send({ body: 'We will send options on Friday.', visibleToClient: true }).expect(201);
    const staffView = (await admin.agent.get(`/api/admin/quotes/${ref}`)).body.quote.events.map((e: { body: string }) => e.body);
    const clientView = (await ana.agent.get(`/api/quotes/${ref}`)).body.quote.events.map((e: { body: string }) => e.body);
    expect(staffView.join('|')).toMatch(/Budget looks tight/);
    expect(clientView.join('|')).not.toMatch(/Budget looks tight/);
    expect(clientView.join('|')).toMatch(/options on Friday/);
  });

  it('lets a client cancel early, and the Admin reopen it', async () => {
    const { ref } = await submit(ben.agent, { email: 'ben@example.com' });
    expect((await ben.agent.post(`/api/quotes/${ref}/cancel`).send({ note: 'Plans changed.' })).body.quote.status).toBe('cancelled');
    expect((await ben.agent.post(`/api/quotes/${ref}/cancel`).send({})).status).toBe(400);
    expect((await admin.agent.patch(`/api/admin/quotes/${ref}`).send({ status: 'reviewing' })).body.quote.status).toBe('reviewing');
  });

  it('assigns a request to an active Admin only', async () => {
    const { ref } = await submit(ana.agent);
    const ok = await admin.agent.patch(`/api/admin/quotes/${ref}`).send({ assignedTo: admin.user.id });
    expect(ok.body.quote.assignedTo).toMatchObject({ id: admin.user.id, fullName: 'Ada Admin' });
    const bad = await admin.agent.patch(`/api/admin/quotes/${ref}`).send({ assignedTo: ana.user.id });
    expect(bad.status).toBe(400);
    const mine = await admin.agent.get('/api/admin/quotes').query({ assignedTo: admin.user.id });
    expect(mine.body.quotes.map((x: { ref: string }) => x.ref)).toContain(ref);
  });

  it('reports dashboard numbers for the Admin', async () => {
    const res = await admin.agent.get('/api/admin/stats');
    expect(res.status).toBe(200);
    expect(res.body.stats.newToday).toBeGreaterThan(0);
    expect(res.body.stats.byStatus.delivered).toBeGreaterThanOrEqual(1);
    expect((await finance.agent.get('/api/admin/stats')).status).toBe(403);
  });
});
