import { PGlite } from '@electric-sql/pglite';
import type { Db, Queryable } from '../../src/db/types.js';

interface Runner {
  query(sql: string, params?: unknown[]): Promise<{ rows: unknown[]; affectedRows?: number }>;
  exec(sql: string): Promise<unknown>;
}

function wrap(c: Runner): Queryable {
  return {
    async query<T>(sql: string, params?: readonly unknown[]) {
      const r = await c.query(sql, params ? [...params] : []);
      return { rows: r.rows as T[], rowCount: r.affectedRows || r.rows.length };
    },
    async exec(sql) {
      await c.exec(sql);
    },
  };
}

/** An in-memory Postgres (PGlite) with the same value parsing as the `pg` pool, so tests need no server. */
export async function createPgliteDb(): Promise<Db> {
  const pg = await PGlite.create({ parsers: { 1082: (v: string) => v, 20: (v: string) => Number(v) } });
  return {
    ...wrap(pg as unknown as Runner),
    tx: (fn) => pg.transaction((t) => fn(wrap(t as unknown as Runner))),
    close: () => pg.close(),
  };
}
