/**
 * Global aggregate statistics — "The World Is Reading".
 *
 * Counts are derived from real database activity only:
 *  - completion counters are incremented inside the same transaction that completes a Juz/Khatma,
 *  - snapshot figures (active Khatmas, readers) are recomputed by `refreshGlobalStats`,
 *    which runs on a schedule (POST /api/cron/stats) and reconciles every counter from source rows,
 *  - reads hit a tiny table and are cached in memory for a short time.
 * No ranking, per-user, per-country or per-group comparisons are ever produced.
 */
import { and, eq, isNotNull, sql } from "drizzle-orm";
import { db, type DbOrTx } from "@/lib/db";
import { assignments, dailyStats, globalCounters, groups, khatmas } from "@/lib/db/schema";

export const COUNTERS = {
  juzCompleted: "juz_completed",
  khatmasCompleted: "khatmas_completed",
  activeKhatmas: "active_khatmas",
  readers: "readers",
} as const;

const utcToday = () => new Date().toISOString().slice(0, 10);

async function increment(tx: DbOrTx, key: string, by: number) {
  await tx
    .insert(globalCounters)
    .values({ key, value: by })
    .onConflictDoUpdate({ target: globalCounters.key, set: { value: sql`${globalCounters.value} + ${by}`, updatedAt: new Date() } });
}

export async function recordJuzCompleted(tx: DbOrTx) {
  await increment(tx, COUNTERS.juzCompleted, 1);
  await tx
    .insert(dailyStats)
    .values({ day: utcToday(), juzCompleted: 1 })
    .onConflictDoUpdate({ target: dailyStats.day, set: { juzCompleted: sql`${dailyStats.juzCompleted} + 1` } });
  invalidateStatsCache();
}

export async function recordKhatmaCompleted(tx: DbOrTx) {
  await increment(tx, COUNTERS.khatmasCompleted, 1);
  await tx
    .insert(dailyStats)
    .values({ day: utcToday(), khatmasCompleted: 1 })
    .onConflictDoUpdate({ target: dailyStats.day, set: { khatmasCompleted: sql`${dailyStats.khatmasCompleted} + 1` } });
  invalidateStatsCache();
}

export interface GlobalStats {
  juzCompleted: number;
  quransCompleted: number;
  activeKhatmas: number;
  readers: number;
  juzCompletedToday: number;
  includesDemoData: boolean;
  updatedAt: string;
}

/** Full reconciliation from source tables. Intended for the scheduled job, not per request. */
export async function refreshGlobalStats() {
  await db.transaction(async (tx) => {
    const [juzRow] = await tx.select({ n: sql<number>`count(*)::int` }).from(assignments).where(eq(assignments.status, "completed"));
    const [khatmaRow] = await tx.select({ n: sql<number>`count(*)::int` }).from(khatmas).where(eq(khatmas.status, "completed"));
    const [activeRow] = await tx
      .select({ n: sql<number>`count(*)::int` })
      .from(khatmas)
      .innerJoin(groups, eq(groups.id, khatmas.groupId))
      .where(and(eq(khatmas.status, "active"), eq(groups.status, "active")));
    const [readersRow] = await tx
      .select({ n: sql<number>`count(distinct ${assignments.completedBy})::int` })
      .from(assignments)
      .where(and(eq(assignments.status, "completed"), isNotNull(assignments.completedBy)));
    const values: Array<[string, number]> = [
      [COUNTERS.juzCompleted, juzRow?.n ?? 0],
      [COUNTERS.khatmasCompleted, khatmaRow?.n ?? 0],
      [COUNTERS.activeKhatmas, activeRow?.n ?? 0],
      [COUNTERS.readers, readersRow?.n ?? 0],
    ];
    for (const [key, value] of values) {
      await tx.insert(globalCounters).values({ key, value }).onConflictDoUpdate({ target: globalCounters.key, set: { value, updatedAt: new Date() } });
    }
    const today = utcToday();
    const [todayRow] = await tx
      .select({ juz: sql<number>`count(*)::int` })
      .from(assignments)
      .where(and(eq(assignments.status, "completed"), sql`(${assignments.completedAt} at time zone 'UTC')::date = ${today}::date`));
    const [todayKhatmas] = await tx
      .select({ n: sql<number>`count(*)::int` })
      .from(khatmas)
      .where(and(eq(khatmas.status, "completed"), sql`(${khatmas.completedAt} at time zone 'UTC')::date = ${today}::date`));
    await tx
      .insert(dailyStats)
      .values({ day: today, juzCompleted: todayRow?.juz ?? 0, khatmasCompleted: todayKhatmas?.n ?? 0 })
      .onConflictDoUpdate({ target: dailyStats.day, set: { juzCompleted: todayRow?.juz ?? 0, khatmasCompleted: todayKhatmas?.n ?? 0 } });
  });
  invalidateStatsCache();
}

const CACHE_TTL_MS = 60_000;
const SNAPSHOT_MAX_AGE_MS = 10 * 60_000;
let cache: { at: number; value: GlobalStats } | undefined;

export function invalidateStatsCache() {
  cache = undefined;
}

export async function getGlobalStats(): Promise<GlobalStats> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.value;
  let rows = await db.select().from(globalCounters);
  const snapshot = rows.find((r) => r.key === COUNTERS.activeKhatmas);
  if (!snapshot || Date.now() - snapshot.updatedAt.getTime() > SNAPSHOT_MAX_AGE_MS) {
    // Safety net if the scheduled job has not run recently.
    await refreshGlobalStats();
    rows = await db.select().from(globalCounters);
  }
  const get = (key: string) => rows.find((r) => r.key === key)?.value ?? 0;
  const [today] = await db.select().from(dailyStats).where(eq(dailyStats.day, utcToday()));
  const [demo] = await db.select({ n: sql<number>`count(*)::int` }).from(groups).where(eq(groups.isDemo, true));
  const value: GlobalStats = {
    juzCompleted: get(COUNTERS.juzCompleted),
    quransCompleted: get(COUNTERS.khatmasCompleted),
    activeKhatmas: get(COUNTERS.activeKhatmas),
    readers: get(COUNTERS.readers),
    juzCompletedToday: today?.juzCompleted ?? 0,
    includesDemoData: (demo?.n ?? 0) > 0,
    updatedAt: new Date().toISOString(),
  };
  cache = { at: Date.now(), value };
  return value;
}
