import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { migrateDown, migrateUp, migrationStatus } from '../src/db/migrate.js';
import type { Db } from '../src/db/types.js';
import { makeDb, type TestDb } from './support/make-db.js';

let handle: TestDb;
let db: Db;
beforeAll(async () => {
  handle = await makeDb();
  db = handle.db;
});
afterAll(async () => {
  await db.close();
  await handle.drop?.();
});

const TABLES = ['users', 'sessions', 'email_tokens', 'audit_log', 'quote_requests', 'quote_events', 'conversations', 'messages', 'conversation_reads', 'notifications', 'invoices', 'invoice_items', 'payments'];

async function tableNames(): Promise<string[]> {
  const r = await db.query<{ table_name: string }>('select table_name from information_schema.tables where table_schema = current_schema()');
  return r.rows.map((x) => x.table_name);
}

describe('migrations', () => {
  it('applies every migration, and running again does nothing', async () => {
    const first = await migrateUp(db);
    expect(first).toHaveLength(4);
    expect(await migrateUp(db)).toEqual([]);
    const names = await tableNames();
    for (const t of TABLES) expect(names).toContain(t);
  });

  it('goes down and up again cleanly', async () => {
    await migrateDown(db, 4);
    const names = await tableNames();
    for (const t of TABLES) expect(names).not.toContain(t);
    await migrateUp(db);
    expect((await migrationStatus(db)).every((m) => m.applied)).toBe(true);
  });

  it('returns money as strings and dates as plain YYYY-MM-DD, like the pg pool', async () => {
    const u = await db.query<{ id: string }>("insert into users (email, full_name, role, password_hash) values ('a@b.co', 'A', 'client', 'x') returning id");
    const q = await db.query<{ id: string }>(
      "insert into quote_requests (ref, client_id, offer_amount, offer_valid_until) values ('QT-1', $1, 1234.5, '2026-12-31') returning id",
      [u.rows[0]!.id],
    );
    const r = await db.query<{ offer_amount: unknown; offer_valid_until: unknown; created_at: unknown; n: unknown }>(
      'select offer_amount, offer_valid_until, created_at, (select count(*) from users) as n from quote_requests where id = $1',
      [q.rows[0]!.id],
    );
    const row = r.rows[0]!;
    expect(row.offer_amount).toBe('1234.50');
    expect(row.offer_valid_until).toBe('2026-12-31');
    expect(row.created_at).toBeInstanceOf(Date);
    expect(row.n).toBe(1);
  });
});
