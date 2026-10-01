/**
 * Self-contained demo mode (IQRAFI_DEMO=1): prepares the embedded database on first start —
 * migrations, the verified Qur'an dataset and the labelled demo group — so testers can run
 * IQRAFI without installing anything.
 */
import path from "node:path";
import { sql } from "drizzle-orm";
import { db, PGLITE_PREFIX } from "@/lib/db";
import { seedQuran } from "../quran/seed";
import { seedDemo } from "./seed";

export async function bootstrapDemo() {
  const migrationsFolder = path.join(process.cwd(), "drizzle");
  if (process.env.DATABASE_URL?.startsWith(PGLITE_PREFIX)) {
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    await migrate(db as never, { migrationsFolder });
  } else {
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");
    await migrate(db, { migrationsFolder });
  }
  const result = await db.execute<{ n: number }>(sql`select count(*)::int as n from ayahs`);
  if (Number(result.rows[0]?.n ?? 0) !== 6236) await seedQuran();
  await seedDemo();
}
