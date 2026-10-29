import { DEFAULT_CURRENCY, type UserRole } from '@coreloop/shared';
import { createDbFromEnv } from '../db/pool.js';
import { hashPassword, passwordProblem, randomToken } from '../lib/crypto.js';
import * as users from '../repos/users.repo.js';

/**
 * Creates the first Admin (and optionally a Finance user) so there is someone who can sign in and invite everyone else.
 * Values come from the environment, never from the repository:
 *   SEED_ADMIN_EMAIL, SEED_ADMIN_NAME, SEED_ADMIN_PASSWORD
 *   SEED_FINANCE_EMAIL, SEED_FINANCE_NAME, SEED_FINANCE_PASSWORD   (optional)
 * Safe to run again: an account that already exists is left alone. A password that is not supplied is generated and
 * printed once. Every seeded account must choose a new password at first sign-in.
 */
async function seed(prefix: 'ADMIN' | 'FINANCE', role: UserRole, db: NonNullable<ReturnType<typeof createDbFromEnv>>): Promise<void> {
  const email = process.env[`SEED_${prefix}_EMAIL`]?.trim().toLowerCase();
  if (!email) {
    if (prefix === 'ADMIN') console.log('SEED_ADMIN_EMAIL is not set: no Admin created.');
    return;
  }
  if (await users.byEmail(db, email)) {
    console.log(`${role}: ${email} already exists, left as it is`);
    return;
  }
  const given = process.env[`SEED_${prefix}_PASSWORD`];
  const password = given || randomToken(12);
  const problem = passwordProblem(password, email);
  if (problem || password.length < 10) {
    console.error(`${role}: that password is not allowed (${problem ?? 'use at least 10 characters'})`);
    process.exitCode = 1;
    return;
  }
  const preferredUsername = prefix.toLowerCase();
  const username = (await users.usernameTaken(db, preferredUsername)) ? null : preferredUsername;
  await users.insertUser(db, {
    email,
    username,
    fullName: process.env[`SEED_${prefix}_NAME`]?.trim() || (role === 'admin' ? 'Administrator' : 'Finance'),
    role,
    passwordHash: await hashPassword(password),
    currency: DEFAULT_CURRENCY,
    emailVerified: true,
    mustChangePassword: true,
  });
  console.log(`${role}: created ${email}${username ? ` (username "${username}")` : ''}${given ? '' : `, temporary password: ${password}`}`);
}

async function main(): Promise<void> {
  const db = createDbFromEnv();
  if (!db) {
    console.error('DATABASE_URL is not set. Copy .env.example to .env and fill it in.');
    process.exit(1);
  }
  try {
    await seed('ADMIN', 'admin', db);
    await seed('FINANCE', 'finance', db);
  } finally {
    await db.close();
  }
}

main().catch((err) => {
  console.error(String(err instanceof Error ? err.message : err));
  process.exit(1);
});
