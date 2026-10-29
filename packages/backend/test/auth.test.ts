import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { anon, boot, makeUser, PASSWORD, signIn, signedInAs, type Harness } from './support/harness.js';

let h: Harness;
beforeAll(async () => {
  h = await boot();
});
afterAll(async () => {
  await h.close();
});

const register = (agent: request.Agent, over: Record<string, unknown> = {}) =>
  agent.post('/api/auth/register').send({ fullName: 'Maria Santos', email: 'maria@example.com', password: PASSWORD, currency: 'PHP', ...over });

describe('registration', () => {
  it('creates a client, signs them in, and never exposes the password hash', async () => {
    const a = anon(h);
    const res = await register(a);
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ email: 'maria@example.com', role: 'client', currency: 'PHP', emailVerified: false });
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|password_hash|\$argon2/);
    const cookie = String(res.headers['set-cookie']);
    expect(cookie).toMatch(/ll_sid=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    const me = await a.get('/api/auth/me');
    expect(me.body.user.email).toBe('maria@example.com');
  });

  it('rejects weak and duplicate sign-ups with clear messages', async () => {
    const short = await register(anon(h), { email: 'x1@example.com', password: 'short' });
    expect(short.status).toBe(400);
    expect(short.body.issues.join(' ')).toMatch(/at least 10/);
    const common = await register(anon(h), { email: 'x2@example.com', password: 'password123' });
    expect(common.status).toBe(400);
    const dup = await register(anon(h), { password: PASSWORD });
    expect(dup.status).toBe(409);
    expect(dup.body.error).toMatch(/already exists/);
  });

  it('emails a verification link, and a link works exactly once', async () => {
    await register(anon(h), { email: 'verify@example.com' });
    const token = h.mailer.tokenFor('verify@example.com', 'verify');
    const ok = await anon(h).post('/api/auth/verify').send({ token });
    expect(ok.status).toBe(200);
    const again = await anon(h).post('/api/auth/verify').send({ token });
    expect(again.status).toBe(400);
    const u = await signIn(h, 'verify@example.com');
    expect((await u.get('/api/auth/me')).body.user.emailVerified).toBe(true);
  });

  it('accepts addresses as given when the server cannot send email', async () => {
    const quiet = await boot({ mail: false });
    const res = await register(request.agent(quiet.app), { email: 'nomail@example.com' });
    expect(res.body.user.emailVerified).toBe(true);
    expect(res.body.emailEnabled).toBe(false);
    await quiet.close();
  });
});

describe('sign in and out', () => {
  it('signs in with email or username and gives the same answer for unknown users and wrong passwords', async () => {
    const u = await makeUser(h, { email: 'rey@example.com', username: 'rey.admin', role: 'admin' });
    expect((await anon(h).post('/api/auth/login').send({ identifier: 'rey@example.com', password: PASSWORD })).status).toBe(200);
    expect((await anon(h).post('/api/auth/login').send({ identifier: 'REY.ADMIN', password: PASSWORD })).status).toBe(200);
    const wrong = await anon(h).post('/api/auth/login').send({ identifier: u.email, password: 'not-the-password' });
    const nobody = await anon(h).post('/api/auth/login').send({ identifier: 'nobody@example.com', password: 'not-the-password' });
    expect(wrong.status).toBe(401);
    expect(nobody.status).toBe(401);
    expect(wrong.body.error).toBe(nobody.body.error);
  });

  it('locks an account for a while after repeated wrong passwords', async () => {
    const u = await makeUser(h, { email: 'lock@example.com' });
    for (let i = 0; i < 8; i++) await anon(h).post('/api/auth/login').send({ identifier: u.email, password: 'wrong-password-1' });
    const res = await anon(h).post('/api/auth/login').send({ identifier: u.email, password: PASSWORD });
    expect(res.status).toBe(429);
    expect(res.body.code).toBe('locked');
  });

  it('refuses disabled accounts with the same generic answer', async () => {
    const u = await makeUser(h, { email: 'off@example.com', status: 'disabled' });
    const res = await anon(h).post('/api/auth/login').send({ identifier: u.email, password: PASSWORD });
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/Wrong username\/email or password/);
  });

  it('logout ends the session for good, even if the cookie is replayed', async () => {
    await makeUser(h, { email: 'out@example.com' });
    const a = anon(h);
    const login = await a.post('/api/auth/login').send({ identifier: 'out@example.com', password: PASSWORD });
    const cookie = String(login.headers['set-cookie']).split(';')[0]!;
    await a.post('/api/auth/logout').expect(200);
    expect((await a.get('/api/auth/me')).body.user).toBeNull();
    const replay = await request(h.app).get('/api/auth/me').set('Cookie', cookie);
    expect(replay.body.user).toBeNull();
  });
});

describe('forgot and reset password', () => {
  it('answers the same for known and unknown addresses, and a link resets the password once', async () => {
    await makeUser(h, { email: 'forgot@example.com' });
    const known = await anon(h).post('/api/auth/forgot').send({ email: 'forgot@example.com' });
    const unknown = await anon(h).post('/api/auth/forgot').send({ email: 'ghost@example.com' });
    expect(known.status).toBe(200);
    expect(unknown.body).toEqual(known.body);
    expect(h.mailer.to('ghost@example.com')).toHaveLength(0);

    const token = h.mailer.tokenFor('forgot@example.com', 'reset');
    const set = await anon(h).post('/api/auth/reset').send({ token, password: 'A-brand-new-pass-77' });
    expect(set.status).toBe(200);
    expect((await anon(h).post('/api/auth/login').send({ identifier: 'forgot@example.com', password: PASSWORD })).status).toBe(401);
    expect((await anon(h).post('/api/auth/login').send({ identifier: 'forgot@example.com', password: 'A-brand-new-pass-77' })).status).toBe(200);
    expect((await anon(h).post('/api/auth/reset').send({ token, password: 'Another-pass-5555' })).status).toBe(400);
  });

  it('"Remind me" emails the username only to the owner of the address', async () => {
    await makeUser(h, { email: 'remind@example.com', username: 'remember.me' });
    await anon(h).post('/api/auth/remind').send({ email: 'remind@example.com' }).expect(200);
    await anon(h).post('/api/auth/remind').send({ email: 'stranger@example.com' }).expect(200);
    expect(h.mailer.to('remind@example.com').at(-1)?.text).toMatch(/remember\.me/);
    expect(h.mailer.to('stranger@example.com')).toHaveLength(0);
  });
});

describe('account settings', () => {
  it('changing the password signs out the other devices but not this one', async () => {
    const { user, agent } = await signedInAs(h, { email: 'devices@example.com' });
    const other = await signIn(h, user.email);
    const bad = await agent.post('/api/me/password').send({ currentPassword: 'nope-nope-nope', newPassword: 'Fresh-pass-12345' });
    expect(bad.status).toBe(400);
    await agent.post('/api/me/password').send({ currentPassword: PASSWORD, newPassword: 'Fresh-pass-12345' }).expect(200);
    expect((await agent.get('/api/auth/me')).body.user?.email).toBe(user.email);
    expect((await other.get('/api/auth/me')).body.user).toBeNull();
  });

  it('updates the profile, including the preferred currency, and keeps usernames unique', async () => {
    const a = await signedInAs(h, { email: 'prof1@example.com', username: 'taken.name' });
    const b = await signedInAs(h, { email: 'prof2@example.com' });
    const ok = await b.agent.patch('/api/me').send({ company: 'Acme', currency: 'EUR' });
    expect(ok.body.user).toMatchObject({ company: 'Acme', currency: 'EUR' });
    expect((await b.agent.patch('/api/me').send({ username: 'TAKEN.name' })).status).toBe(409);
    expect((await b.agent.patch('/api/me').send({ currency: 'XXX' })).status).toBe(400);
    expect(a.user.id).not.toBe(b.user.id);
  });

  it('holds a "must change password" account to the password screen until it is changed', async () => {
    const { agent } = await signedInAs(h, { email: 'temp@example.com', mustChange: true });
    const blocked = await agent.get('/api/me/sessions');
    expect(blocked.status).toBe(403);
    expect(blocked.body.code).toBe('must_change_password');
    await agent.post('/api/me/password').send({ currentPassword: PASSWORD, newPassword: 'Chosen-by-me-4321' }).expect(200);
    expect((await agent.get('/api/me/sessions')).status).toBe(200);
  });
});

describe('request safety', () => {
  it('blocks writes that come from another website, allows the site itself', async () => {
    const evil = await request(h.app).post('/api/auth/logout').set('Origin', 'http://evil.example');
    expect(evil.status).toBe(403);
    const home = await request(h.app).post('/api/auth/logout').set('Origin', 'http://localhost:5173');
    expect(home.status).toBe(200);
  });

  it('rate-limits sign-in attempts per address', async () => {
    const limited = await boot({ rateLimits: true });
    const a = request.agent(limited.app);
    let last = 0;
    for (let i = 0; i < 31; i++) last = (await a.post('/api/auth/login').send({ identifier: 'nobody@example.com', password: 'whatever-it-is' })).status;
    expect(last).toBe(429);
    await limited.close();
  }, 60_000);

  it('reports health with the database state', async () => {
    const res = await request(h.app).get('/api/health');
    expect(res.body).toMatchObject({ ok: true, db: 'up' });
  });
});
