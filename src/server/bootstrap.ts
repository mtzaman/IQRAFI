/**
 * Start-up database preparation, enabled by environment variables (see src/instrumentation.ts):
 *
 *  IQRAFI_AUTO_MIGRATE=1   apply migrations and load the verified Qur'an dataset if missing
 *                          (for hosts without a terminal, e.g. cPanel "Setup Node.js App")
 *  IQRAFI_DEMO=1           also seed the labelled demo group (offline demo package only)
 *  IQRAFI_ADMIN_EMAIL=...  grant platform admin to this existing account on start
 *
 * Safe to run on every start and from several processes at once: migrations are serialised
 * with a PostgreSQL advisory lock and every step is idempotent.
 */
import path from "node:path";
import { sql } from "drizzle-orm";
import { Client } from "pg";
import { db, PGLITE_PREFIX } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { seedQuran } from "./quran/seed";

const MIGRATION_LOCK_ID = 7_351_903; // arbitrary, app-specific

async function migrateDatabase() {
  const migrationsFolder = path.join(process.cwd(), "drizzle");
  const url = process.env.DATABASE_URL ?? "";
  if (url.startsWith(PGLITE_PREFIX)) {
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    await migrate(db as never, { migrationsFolder });
    return;
  }
  const { migrate } = await import("drizzle-orm/node-postgres/migrator");
  const lock = new Client({ connectionString: url });
  await lock.connect();
  try {
    await lock.query("select pg_advisory_lock($1)", [MIGRATION_LOCK_ID]);
    await migrate(db, { migrationsFolder });
  } finally {
    await lock.query("select pg_advisory_unlock($1)", [MIGRATION_LOCK_ID]).catch(() => undefined);
    await lock.end();
  }
}

export async function bootstrapDatabase(opts: { demo: boolean; adminEmail?: string | null }) {
  await migrateDatabase();
  const result = await db.execute<{ n: number }>(sql`select count(*)::int as n from ayahs`);
  if (Number(result.rows[0]?.n ?? 0) !== 6236) await seedQuran();
  if (opts.demo) {
    const { seedDemo } = await import("./demo/seed");
    await seedDemo();
  }
  const email = opts.adminEmail?.trim().toLowerCase();
  if (email) {
    const updated = await db
      .update(users)
      .set({ platformRole: "admin" })
      .where(sql`lower(${users.email}) = ${email}`)
      .returning({ id: users.id });
    console.log(updated.length ? `[IQRAFI] Admin access granted to ${email}` : `[IQRAFI] IQRAFI_ADMIN_EMAIL: no account for ${email} yet — sign up, then restart the app`);
  }
}
