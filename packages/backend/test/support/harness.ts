import request from 'supertest';
import type { CurrencyCode, UserRole } from '@coreloop/shared';
import { createApp } from '../../src/app.js';
import { migrateUp } from '../../src/db/migrate.js';
import type { Db } from '../../src/db/types.js';
import { hashPassword } from '../../src/lib/crypto.js';
import * as users from '../../src/repos/users.repo.js';
import type { Mailer, MailMessage } from '../../src/services/mailer.js';
import { makeDb } from './make-db.js';

export const PASSWORD = 'Correct-horse-9';

/** Collects the emails the app would have sent. */
export class FakeMailer implements Mailer {
  sent: MailMessage[] = [];
  constructor(readonly enabled = true) {}
  async send(m: MailMessage): Promise<void> {
    this.sent.push(m);
  }
  to(address: string): MailMessage[] {
    return this.sent.filter((m) => m.to === address);
  }
  /** The one-time token inside the newest email to `address` ("/verify/<token>", "/reset/<token>", "/invite/<token>"). */
  tokenFor(address: string, kind: 'verify' | 'reset' | 'invite'): string {
    const mails = this.to(address).reverse();
    for (const m of mails) {
      const hit = new RegExp(`#/${kind}/([A-Za-z0-9_-]+)`).exec(m.text);
      if (hit) return hit[1]!;
    }
    throw new Error(`no ${kind} email for ${address}`);
  }
}

export interface Harness {
  db: Db;
  mailer: FakeMailer;
  app: ReturnType<typeof createApp>;
  close(): Promise<void>;
}

export async function boot(opts: { mail?: boolean; rateLimits?: boolean } = {}): Promise<Harness> {
  const { db, drop } = await makeDb();
  await migrateUp(db);
  const mailer = new FakeMailer(opts.mail ?? true);
  const app = createApp({ db, mailer, rateLimits: opts.rateLimits ?? false });
  return {
    db,
    mailer,
    app,
    close: async () => {
      await (app.locals['close'] as () => Promise<void>)(); // stops live streams, closes the database
      await drop?.();
    },
  };
}

export interface NewTestUser {
  role?: UserRole;
  email?: string;
  fullName?: string;
  username?: string | null;
  password?: string;
  verified?: boolean;
  currency?: CurrencyCode;
  mustChange?: boolean;
  status?: 'active' | 'pending' | 'disabled';
}

let counter = 0;

export async function makeUser(h: Harness, o: NewTestUser = {}): Promise<users.UserRecord> {
  counter += 1;
  const role = o.role ?? 'client';
  return users.insertUser(h.db, {
    email: o.email ?? `${role}${counter}@example.com`,
    username: o.username ?? null,
    fullName: o.fullName ?? `${role} ${counter}`,
    role,
    status: o.status ?? 'active',
    passwordHash: await hashPassword(o.password ?? PASSWORD),
    currency: o.currency ?? 'USD',
    emailVerified: o.verified ?? true,
    mustChangePassword: o.mustChange ?? false,
  });
}

/** A browser-like client that keeps its cookie between calls. */
export type Agent = ReturnType<typeof request.agent>;

export async function signIn(h: Harness, identifier: string, password = PASSWORD): Promise<Agent> {
  const agent = request.agent(h.app);
  const res = await agent.post('/api/auth/login').send({ identifier, password });
  if (res.status !== 200) throw new Error(`sign-in failed for ${identifier}: ${res.status} ${JSON.stringify(res.body)}`);
  return agent;
}

/** Creates a user and returns an already signed-in agent for them. */
export async function signedInAs(h: Harness, o: NewTestUser = {}): Promise<{ user: users.UserRecord; agent: Agent }> {
  const user = await makeUser(h, o);
  return { user, agent: await signIn(h, user.email, o.password) };
}

export function anon(h: Harness): Agent {
  return request.agent(h.app);
}
