import "dotenv/config";
import { afterAll, beforeEach } from "vitest";

process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

const APP_TABLES = [
  "analytics_events",
  "rate_limits",
  "daily_stats",
  "global_counters",
  "user_blocks",
  "reports",
  "notifications",
  "bookmarks",
  "dedications",
  "invitations",
  "reading_progress",
  "assignment_events",
  "assignments",
  "khatmas",
  "group_members",
  "groups",
  "sessions",
  "oauth_accounts",
  "users",
];

beforeEach(async () => {
  const { db } = await import("@/lib/db");
  const { sql } = await import("drizzle-orm");
  await db.execute(sql.raw(`truncate ${APP_TABLES.join(", ")} restart identity cascade`));
  const { invalidateStatsCache } = await import("@/server/services/stats");
  invalidateStatsCache();
});

afterAll(async () => {
  const { closeDb } = await import("@/lib/db");
  await closeDb();
});
