import pg from 'pg';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import type { Db, Queryable } from './types.js';

// date -> 'YYYY-MM-DD' (the default turns it into a local-midnight Date, which shifts the day across time zones);
// int8 -> number (our counts and ids are small).
pg.types.setTypeParser(1082, (v: string) => v);
pg.types.setTypeParser(20, (v: string) => Number(v));

export interface PgOptions {
  schema?: string | null;
  ssl?: boolean;
  max?: number;
}

export function createPgDb(databaseUrl: string, opts: PgOptions = {}): Db {
  const schema = opts.schema ?? null;
  if (schema && !/^[a-z_][a-z0-9_]*$/.test(schema)) throw new Error(`Invalid DB_SCHEMA "${schema}"`);

  const pool = new pg.Pool({
    connectionString: databaseUrl,
    max: opts.max ?? 10,
    ssl: opts.ssl ? { rejectUnauthorized: false } : undefined,
    connectionTimeoutMillis: 8000,
    idleTimeoutMillis: 30_000,
    // A named schema (dev, test) is chosen when the connection opens, so every query lands in it.
    ...(schema ? { options: `-c search_path=${schema},public` } : {}),
  });
  // A dropped connection (for example the SSH tunnel restarting) must not crash the process.
  pool.on('error', (err) => logger.warn('idle database client error', { error: String(err) }));

  const wrap = (c: pg.Pool | pg.PoolClient): Queryable => ({
    async query(sql, params) {
      const r = await c.query(sql, params ? [...params] : undefined);
      return { rows: r.rows, rowCount: r.rowCount ?? r.rows.length };
    },
    async exec(sql) {
      await c.query(sql);
    },
  });

  return {
    ...wrap(pool),
    async tx(fn) {
      const client = await pool.connect();
      try {
        await client.query('begin');
        const out = await fn(wrap(client));
        await client.query('commit');
        return out;
      } catch (err) {
        try {
          await client.query('rollback');
        } catch {
          /* the connection is already gone; the original error is the useful one */
        }
        throw err;
      } finally {
        client.release();
      }
    },
    close: () => pool.end(),
  };
}

/** The database the running server uses. Null when DATABASE_URL is not set (the API then answers 503 for anything that needs it). */
export function createDbFromEnv(): Db | null {
  if (!env.databaseUrl) return null;
  return createPgDb(env.databaseUrl, { schema: env.dbSchema, ssl: env.dbSsl });
}
