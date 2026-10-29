import { randomBytes } from 'node:crypto';
import pg from 'pg';
import { createPgDb } from '../../src/db/pool.js';
import type { Db } from '../../src/db/types.js';
import { createPgliteDb } from './pglite-db.js';

export interface TestDb {
  db: Db;
  /** True when the tests run against a real PostgreSQL server (TEST_DATABASE_URL) instead of the in-memory one. */
  real: boolean;
  /** Removes whatever the test created. Call after db.close(). */
  drop?: () => Promise<void>;
}

/**
 * The database a test file runs on. By default an in-memory Postgres (PGlite), which needs no server.
 * With TEST_DATABASE_URL set it is a throwaway schema (t_<random>) on that real server, dropped afterwards,
 * so the same tests can prove the SQL on the production Postgres without touching any real data:
 *   $env:TEST_DATABASE_URL = "postgresql://user:pass@127.0.0.1:5434/lablace_db"; npm test -w packages/backend
 */
export async function makeDb(): Promise<TestDb> {
  const url = process.env['TEST_DATABASE_URL'];
  if (!url) return { db: await createPgliteDb(), real: false };

  const schema = `t_${randomBytes(6).toString('hex')}`;
  const admin = new pg.Client({ connectionString: url });
  await admin.connect();
  await admin.query(`create schema "${schema}"`);
  return {
    db: createPgDb(url, { schema, max: 5 }),
    real: true,
    drop: async () => {
      await admin.query(`drop schema "${schema}" cascade`);
      await admin.end();
    },
  };
}
