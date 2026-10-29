/**
 * Runs the whole API against an in-memory Postgres (PGlite), so the portal can be tried with no database
 * server and no SSH tunnel:   npm run dev:demo -w packages/backend
 * Everything is thrown away when the process stops. Not for production.
 *
 * Demo accounts (password for all: Demo-password-1):
 *   admin@demo.test   finance@demo.test   ana@demo.test   ben@demo.test
 */
import { createApp } from '../src/app.js';
import { migrateUp } from '../src/db/migrate.js';
import { hashPassword } from '../src/lib/crypto.js';
import * as users from '../src/repos/users.repo.js';
import type { Mailer, MailMessage } from '../src/services/mailer.js';
import { createPgliteDb } from '../test/support/pglite-db.js';

const PASSWORD = 'Demo-password-1';
const port = Number(process.env['DEMO_PORT']) || 8788;

/** Prints emails instead of sending them, so verification and reset links can be clicked from the console. */
const mailer: Mailer = {
  enabled: process.env['DEMO_MAIL'] !== 'off',
  async send(m: MailMessage) {
    console.log(`\n--- email to ${m.to}: ${m.subject}\n${m.text}\n`);
  },
};

const db = await createPgliteDb();
await migrateUp(db);

const make = async (role: 'admin' | 'finance' | 'client', email: string, fullName: string, extra: { username?: string; company?: string; currency?: 'PHP' | 'USD' } = {}) =>
  users.insertUser(db, {
    email,
    username: extra.username ?? null,
    fullName,
    company: extra.company ?? '',
    role,
    passwordHash: await hashPassword(PASSWORD),
    currency: extra.currency ?? 'USD',
    emailVerified: true,
    // DEMO_MUST_CHANGE=1 shows what a freshly seeded Admin sees: a forced password change at first sign-in
    mustChangePassword: process.env['DEMO_MUST_CHANGE'] === '1' && role !== 'client',
  });

await make('admin', 'admin@demo.test', 'Ada Admin', { username: 'admin' });
await make('finance', 'finance@demo.test', 'Fin Finance', { username: 'finance' });
await make('client', 'ana@demo.test', 'Ana Santos', { company: 'Santos Logistics', currency: 'PHP' });
await make('client', 'ben@demo.test', 'Ben Carter', { company: 'Carter & Co', currency: 'USD' });

const app = createApp({ db, mailer, rateLimits: false });
app.listen(port, () => {
  console.log(`demo API on http://localhost:${port}  (in-memory database)`);
  console.log(`accounts (password ${PASSWORD}): admin@demo.test, finance@demo.test, ana@demo.test, ben@demo.test`);
});
