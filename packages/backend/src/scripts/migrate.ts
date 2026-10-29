import { env } from '../config/env.js';
import { createDbFromEnv } from '../db/pool.js';
import { migrateDown, migrateUp, migrationStatus } from '../db/migrate.js';

/** npm run db:migrate | db:migrate:down | db:status (run from packages/backend, with the SSH tunnel open in dev). */
async function main(): Promise<void> {
  const cmd = process.argv[2] ?? 'up';
  const db = createDbFromEnv();
  if (!db) {
    console.error('DATABASE_URL is not set. Copy .env.example to .env and fill it in.');
    process.exit(1);
  }
  console.log(`database schema: ${env.dbSchema ?? 'public'}`);
  try {
    // A named schema (dev, test) is created on first use so it can sit next to production data in one database.
    // (Always, even for `status`: with no such schema the ledger table would otherwise land in "public".)
    if (env.dbSchema) await db.exec(`create schema if not exists "${env.dbSchema}"`);
    if (cmd === 'up') {
      const applied = await migrateUp(db);
      console.log(applied.length ? `applied: ${applied.join(', ')}` : 'already up to date');
    } else if (cmd === 'down') {
      const steps = Number(process.argv[3]) || 1;
      console.log(`reverted: ${(await migrateDown(db, steps)).join(', ') || 'nothing'}`);
    } else if (cmd === 'status') {
      for (const m of await migrationStatus(db)) console.log(`${m.applied ? 'applied' : 'pending'}  ${m.name}`);
    } else {
      console.error(`unknown command "${cmd}" (use up, down or status)`);
      process.exitCode = 1;
    }
  } finally {
    await db.close();
  }
}

main().catch((err) => {
  console.error(String(err instanceof Error ? err.message : err));
  process.exit(1);
});
