import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Db } from './types.js';

/**
 * Tiny SQL migration runner. Files in packages/backend/migrations are named 001_name.sql, 002_name.sql, ...
 * and hold an "-- Up Migration" section and an optional "-- Down Migration" section (the same markers
 * node-pg-migrate uses, so switching tools later needs no rewrite). Applied names live in schema_migrations.
 */
export const MIGRATIONS_DIR = fileURLToPath(new URL('../../migrations', import.meta.url));

const DOWN_MARKER = /^--\s*Down Migration\s*$/im;
const UP_MARKER = /^--\s*Up Migration\s*$/im;

function split(sql: string): { up: string; down: string } {
  const at = sql.search(DOWN_MARKER);
  if (at < 0) return { up: sql.replace(UP_MARKER, ''), down: '' };
  return { up: sql.slice(0, at).replace(UP_MARKER, ''), down: sql.slice(at).replace(DOWN_MARKER, '') };
}

async function files(dir: string): Promise<string[]> {
  return (await readdir(dir)).filter((f) => /^\d+.*\.sql$/.test(f)).sort();
}

async function ensureTable(db: Db): Promise<void> {
  await db.exec('create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())');
}

async function appliedNames(db: Db): Promise<string[]> {
  const r = await db.query<{ name: string }>('select name from schema_migrations order by name');
  return r.rows.map((x) => x.name);
}

/** Applies every migration that has not run yet, each in its own transaction. Returns the names it applied. */
export async function migrateUp(db: Db, dir = MIGRATIONS_DIR): Promise<string[]> {
  await ensureTable(db);
  const done = new Set(await appliedNames(db));
  const applied: string[] = [];
  for (const name of await files(dir)) {
    if (done.has(name)) continue;
    const { up } = split(await readFile(path.join(dir, name), 'utf8'));
    await db.tx(async (q) => {
      await q.exec(up);
      await q.query('insert into schema_migrations (name) values ($1)', [name]);
    });
    applied.push(name);
  }
  return applied;
}

/** Reverts the most recent `steps` migrations (development only; there is no undo for data). */
export async function migrateDown(db: Db, steps = 1, dir = MIGRATIONS_DIR): Promise<string[]> {
  await ensureTable(db);
  const done = (await appliedNames(db)).reverse().slice(0, steps);
  for (const name of done) {
    const { down } = split(await readFile(path.join(dir, name), 'utf8'));
    if (!down.trim()) throw new Error(`${name} has no "-- Down Migration" section`);
    await db.tx(async (q) => {
      await q.exec(down);
      await q.query('delete from schema_migrations where name = $1', [name]);
    });
  }
  return done;
}

export async function migrationStatus(db: Db, dir = MIGRATIONS_DIR): Promise<{ name: string; applied: boolean }[]> {
  await ensureTable(db);
  const done = new Set(await appliedNames(db));
  return (await files(dir)).map((name) => ({ name, applied: done.has(name) }));
}
