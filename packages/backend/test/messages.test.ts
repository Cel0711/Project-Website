import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { anon, boot, signedInAs, type Harness } from './support/harness.js';

let h: Harness;
let admin: Awaited<ReturnType<typeof signedInAs>>;
let admin2: Awaited<ReturnType<typeof signedInAs>>;
let finance: Awaited<ReturnType<typeof signedInAs>>;
let ana: Awaited<ReturnType<typeof signedInAs>>;
let ben: Awaited<ReturnType<typeof signedInAs>>;

beforeAll(async () => {
  h = await boot();
  admin = await signedInAs(h, { role: 'admin', fullName: 'Ada Admin' });
  admin2 = await signedInAs(h, { role: 'admin', fullName: 'Bo Admin' });
  finance = await signedInAs(h, { role: 'finance' });
  ana = await signedInAs(h, { email: 'ana@example.com', fullName: 'Ana Client' });
  ben = await signedInAs(h, { email: 'ben@example.com', fullName: 'Ben Client' });
});
afterAll(async () => {
  await h.close();
});

async function generalOf(client: typeof ana): Promise<string> {
  const list = await client.agent.get('/api/conversations');
  return list.body.conversations.find((c: { quoteId: string | null }) => c.quoteId === null).id;
}

describe('conversations', () => {
  it('gives every client a General thread, and one more for each request', async () => {
    const first = await ana.agent.get('/api/conversations');
    expect(first.body.conversations).toHaveLength(1);
    expect(first.body.conversations[0]).toMatchObject({ quoteId: null, subject: 'General', unread: 0 });
    await ana.agent.post('/api/quotes').send({ name: 'Ana', company: '', email: 'ana@example.com', phone: '', planId: null, planName: null, kinds: ['Dashboard'], budget: '', timeline: '', notes: 'hello', design: null }).expect(201);
    const second = await ana.agent.get('/api/conversations');
    expect(second.body.conversations).toHaveLength(2);
    expect(second.body.conversations.some((c: { quoteRef: string | null }) => c.quoteRef?.startsWith('QT-'))).toBe(true);
  });

  it('keeps one client out of another client\'s thread, and Finance out of chat altogether', async () => {
    const anaThread = await generalOf(ana);
    expect((await ben.agent.get(`/api/conversations/${anaThread}/messages`)).status).toBe(404);
    expect((await ben.agent.post(`/api/conversations/${anaThread}/messages`).send({ body: 'hi' })).status).toBe(404);
    expect((await finance.agent.get('/api/conversations')).status).toBe(403);
    expect((await anon(h).get('/api/conversations')).status).toBe(401);
  });

  it('chats both ways, counts unread, and shows "seen"', async () => {
    const id = await generalOf(ana);
    const sent = await ana.agent.post(`/api/conversations/${id}/messages`).send({ body: 'Hi, can we talk about the dashboard?' });
    expect(sent.status).toBe(201);
    expect(sent.body.message).toMatchObject({ body: 'Hi, can we talk about the dashboard?', sender: { fullName: 'Ana Client', role: 'client' } });

    // every Admin sees it, as unread, and gets a bell entry
    for (const a of [admin, admin2]) {
      const list = await a.agent.get('/api/conversations');
      const c = list.body.conversations.find((x: { id: string }) => x.id === id);
      expect(c.unread).toBe(1);
      expect(c.lastMessagePreview).toMatch(/dashboard/);
      const bell = await a.agent.get('/api/notifications');
      expect(bell.body.items.some((n: { link: string }) => n.link === `/messages/${id}`)).toBe(true);
    }

    // one Admin answers; reading clears that Admin's unread count and marks it seen for Ana
    await admin.agent.post(`/api/conversations/${id}/read`).expect(200);
    const reply = await admin.agent.post(`/api/conversations/${id}/messages`).send({ body: 'Yes. Tomorrow 10am works.' });
    expect(reply.body.message.sender.role).toBe('admin');
    const stillUnread = (await admin2.agent.get('/api/conversations')).body.conversations.find((x: { id: string }) => x.id === id);
    expect(stillUnread.unread).toBe(2); // the other Admin has read neither yet

    const anaView = await ana.agent.get(`/api/conversations/${id}/messages`);
    expect(anaView.body.messages.map((m: { body: string }) => m.body)).toEqual(['Hi, can we talk about the dashboard?', 'Yes. Tomorrow 10am works.']);
    expect(anaView.body.conversation.unread).toBe(1);
    expect(anaView.body.otherReadId).toBeGreaterThanOrEqual(sent.body.message.id); // Ada has read Ana's message
    await ana.agent.post(`/api/conversations/${id}/read`).expect(200);
    const adminView = await admin.agent.get(`/api/conversations/${id}/messages`);
    expect(adminView.body.otherReadId).toBe(reply.body.message.id); // Ana has now read the reply

    // polling for new messages only
    const after = await ana.agent.get(`/api/conversations/${id}/messages`).query({ after: sent.body.message.id });
    expect(after.body.messages).toHaveLength(1);
  });

  it('lets an Admin open a thread with a client first', async () => {
    const started = await admin.agent.post('/api/conversations').send({ clientId: ben.user.id });
    expect(started.status).toBe(201);
    const id = started.body.conversation.id;
    await admin.agent.post(`/api/conversations/${id}/messages`).send({ body: 'Welcome aboard, Ben.' }).expect(201);
    const mine = await ben.agent.get('/api/conversations');
    expect(mine.body.conversations.find((c: { id: string }) => c.id === id).unread).toBe(1);
    expect((await ben.agent.post('/api/conversations').send({ clientId: ana.user.id })).status).toBe(403);
  });

  it('validates and bounds messages', async () => {
    const id = await generalOf(ana);
    expect((await ana.agent.post(`/api/conversations/${id}/messages`).send({ body: '   ' })).status).toBe(400);
    expect((await ana.agent.post(`/api/conversations/${id}/messages`).send({ body: 'x'.repeat(5001) })).status).toBe(400);
    const xss = await ana.agent.post(`/api/conversations/${id}/messages`).send({ body: '<img src=x onerror=alert(1)>' });
    expect(xss.status).toBe(201); // stored as plain text; the pages escape it when drawing
    expect(xss.body.message.body).toBe('<img src=x onerror=alert(1)>');
  });
});

describe('notifications', () => {
  it('lists, counts and clears them per person', async () => {
    const before = await admin2.agent.get('/api/notifications');
    expect(before.body.unread).toBeGreaterThan(0);
    await admin2.agent.post('/api/notifications/read').send({}).expect(200);
    expect((await admin2.agent.get('/api/notifications')).body.unread).toBe(0);
    expect((await admin.agent.get('/api/notifications')).body.unread).toBeGreaterThanOrEqual(0);
  });
});

describe('live updates', () => {
  it('pushes a "message" event to the other side over Server-Sent Events', async () => {
    const server = http.createServer(h.app).listen(0);
    const port = (server.address() as AddressInfo).port;
    // sign in again to get a cookie value we can hand to a raw stream
    const login = await anon(h).post('/api/auth/login').send({ identifier: 'ana@example.com', password: 'Correct-horse-9' });
    const sid = String(login.headers['set-cookie']).split(';')[0]!;

    const id = await generalOf(ana);
    let sent = false;
    let seen = '';
    let postStatus = 0;
    const got = new Promise<string>((resolve, reject) => {
      const req = http.get({ port, path: '/api/events', headers: { Cookie: sid } }, (res) => {
        if (!String(res.headers['content-type']).includes('text/event-stream')) reject(new Error(`unexpected content type ${res.headers['content-type']}`));
        res.on('data', (chunk: Buffer) => {
          seen += chunk.toString();
          // the stream is open: now an Admin writes
          if (!sent && seen.includes(': connected')) {
            sent = true;
            void admin.agent.post(`/api/conversations/${id}/messages`).send({ body: 'ping over SSE' }).then((r) => (postStatus = r.status));
          }
          if (seen.includes('"type":"message"')) {
            req.destroy();
            resolve(seen);
          }
        });
      });
      req.on('error', (e) => ((e as NodeJS.ErrnoException).code === 'ECONNRESET' ? undefined : reject(e)));
      setTimeout(() => reject(new Error(`no event received; sent=${sent} postStatus=${postStatus} seen=${JSON.stringify(seen)}`)), 8000);
    });
    expect(await got).toMatch(/"conversationId":"/);
    server.close();
  });

  it('refuses an event stream without a session', async () => {
    expect((await anon(h).get('/api/events')).status).toBe(401);
  });
});
