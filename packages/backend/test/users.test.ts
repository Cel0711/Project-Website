import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { anon, boot, PASSWORD, signedInAs, signIn, type Harness } from './support/harness.js';

let h: Harness;
let admin: Awaited<ReturnType<typeof signedInAs>>;
let finance: Awaited<ReturnType<typeof signedInAs>>;
let ana: Awaited<ReturnType<typeof signedInAs>>;

beforeAll(async () => {
  h = await boot();
  admin = await signedInAs(h, { role: 'admin', email: 'admin@example.com', fullName: 'Ada Admin' });
  finance = await signedInAs(h, { role: 'finance', email: 'fin@example.com' });
  ana = await signedInAs(h, { email: 'ana@example.com', fullName: 'Ana Client' });
});
afterAll(async () => {
  await h.close();
});

describe('inviting staff (email available)', () => {
  it('emails an invite, and accepting it sets the password and activates the account', async () => {
    const res = await admin.agent.post('/api/admin/users').send({ fullName: 'Fiona Finance', email: 'fiona@example.com', role: 'finance' });
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ role: 'finance', status: 'pending', username: 'fiona' });
    expect(res.body.tempPassword).toBeUndefined();

    // cannot sign in before accepting
    expect((await anon(h).post('/api/auth/login').send({ identifier: 'fiona@example.com', password: PASSWORD })).status).toBe(401);

    const token = h.mailer.tokenFor('fiona@example.com', 'invite');
    await anon(h).post('/api/auth/reset').send({ token, password: 'My-own-password-81' }).expect(200);
    const fiona = await signIn(h, 'fiona', 'My-own-password-81');
    const me = await fiona.get('/api/auth/me');
    expect(me.body.user).toMatchObject({ role: 'finance', status: 'active', emailVerified: true, mustChangePassword: false });
    expect((await fiona.get('/api/finance/summary')).status).toBe(200);
  });

  it('rejects duplicates and bad input, and is for Admins only', async () => {
    expect((await admin.agent.post('/api/admin/users').send({ fullName: 'Dup', email: 'fin@example.com', role: 'admin' })).status).toBe(409);
    expect((await admin.agent.post('/api/admin/users').send({ fullName: 'Bad', email: 'bad@example.com', role: 'client' })).status).toBe(400);
    expect((await finance.agent.post('/api/admin/users').send({ fullName: 'X', email: 'x@example.com', role: 'admin' })).status).toBe(403);
    expect((await ana.agent.get('/api/admin/users')).status).toBe(403);
  });
});

describe('inviting staff (no email server)', () => {
  it('shows a one-time temporary password that must be changed at first sign-in', async () => {
    const quiet = await boot({ mail: false });
    const boss = await signedInAs(quiet, { role: 'admin', email: 'boss@example.com' });
    const res = await boss.agent.post('/api/admin/users').send({ fullName: 'Sam Staff', email: 'sam@example.com', role: 'admin' });
    expect(res.status).toBe(201);
    const temp: string = res.body.tempPassword;
    expect(temp).toBeTruthy();
    expect(res.body.user.status).toBe('active');

    const sam = await signIn(quiet, 'sam@example.com', temp);
    const blocked = await sam.get('/api/admin/users');
    expect(blocked.status).toBe(403);
    expect(blocked.body.code).toBe('must_change_password');
    await sam.post('/api/me/password').send({ currentPassword: temp, newPassword: 'Sam-chose-this-77' }).expect(200);
    expect((await sam.get('/api/admin/users')).status).toBe(200);

    // an Admin can also hand out a fresh temporary password
    const reset = await boss.agent.post(`/api/admin/users/${res.body.user.id}/reset`).send({});
    expect(reset.body.tempPassword).toBeTruthy();
    expect((await sam.get('/api/auth/me')).body.user).toBeNull(); // signed out everywhere
    await quiet.close();
  });
});

describe('managing accounts', () => {
  it('lists and filters users', async () => {
    const all = await admin.agent.get('/api/admin/users');
    expect(all.body.total).toBeGreaterThanOrEqual(4);
    const clients = await admin.agent.get('/api/admin/users').query({ role: 'client' });
    expect(clients.body.users.every((u: { role: string }) => u.role === 'client')).toBe(true);
    const found = await admin.agent.get('/api/admin/users').query({ q: 'ana@' });
    expect(found.body.users.map((u: { email: string }) => u.email)).toEqual(['ana@example.com']);
    expect(JSON.stringify(all.body)).not.toMatch(/passwordHash/);
  });

  it('disabling a user signs them out immediately and blocks sign-in', async () => {
    const victim = await signedInAs(h, { email: 'victim@example.com' });
    expect((await victim.agent.get('/api/auth/me')).body.user).not.toBeNull();
    await admin.agent.patch(`/api/admin/users/${victim.user.id}`).send({ status: 'disabled' }).expect(200);
    expect((await victim.agent.get('/api/auth/me')).body.user).toBeNull();
    expect((await anon(h).post('/api/auth/login').send({ identifier: 'victim@example.com', password: PASSWORD })).status).toBe(401);
    await admin.agent.patch(`/api/admin/users/${victim.user.id}`).send({ status: 'active' }).expect(200);
    expect((await anon(h).post('/api/auth/login').send({ identifier: 'victim@example.com', password: PASSWORD })).status).toBe(200);
  });

  it('stops an Admin from locking themselves out', async () => {
    expect((await admin.agent.patch(`/api/admin/users/${admin.user.id}`).send({ status: 'disabled' })).status).toBe(403);
    expect((await admin.agent.patch(`/api/admin/users/${admin.user.id}`).send({ role: 'client' })).status).toBe(403);
    const second = await signedInAs(h, { role: 'admin', email: 'admin2@example.com' });
    // with two Admins, one may demote the other, and the last one standing is protected
    expect((await admin.agent.patch(`/api/admin/users/${second.user.id}`).send({ role: 'finance' })).status).toBe(200);
    expect((await second.agent.get('/api/admin/users')).status).toBe(403);
  });

  it('lists clients for pickers, for Admin and Finance', async () => {
    const a = await admin.agent.get('/api/admin/clients');
    const f = await finance.agent.get('/api/finance/clients');
    for (const r of [a, f]) {
      expect(r.status).toBe(200);
      expect(r.body.clients.every((c: { email: string }) => !c.email.startsWith('admin') && !c.email.startsWith('fin@'))).toBe(true);
      expect(r.body.clients.find((c: { email: string }) => c.email === 'ana@example.com')).toMatchObject({ fullName: 'Ana Client', currency: 'USD' });
    }
    expect((await ana.agent.get('/api/admin/clients')).status).toBe(403);
  });
});
