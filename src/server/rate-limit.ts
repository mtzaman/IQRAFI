/**
 * Fixed-window rate limiter stored in PostgreSQL so limits hold across serverless
 * instances. Keys should combine the action with an identifier (IP or user id).
 */
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { AppError } from "./errors";

export const LIMITS = {
  login: { max: 10, windowSec: 15 * 60 },
  signup: { max: 5, windowSec: 60 * 60 },
  mutation: { max: 120, windowSec: 60 },
  invitation: { max: 30, windowSec: 60 * 60 },
  report: { max: 10, windowSec: 60 * 60 },
  progress: { max: 240, windowSec: 60 },
} as const;
export type LimitName = keyof typeof LIMITS;

export async function consumeRateLimit(name: LimitName, identifier: string): Promise<{ allowed: boolean; remaining: number }> {
  const { max, windowSec } = LIMITS[name];
  const key = `${name}:${identifier}`;
  const result = await db.execute<{ count: number }>(sql`
    insert into rate_limits (key, count, reset_at)
    values (${key}, 1, now() + make_interval(secs => ${windowSec}))
    on conflict (key) do update set
      count = case when rate_limits.reset_at <= now() then 1 else rate_limits.count + 1 end,
      reset_at = case when rate_limits.reset_at <= now() then excluded.reset_at else rate_limits.reset_at end
    returning count
  `);
  const count = Number(result.rows[0]?.count ?? 1);
  return { allowed: count <= max, remaining: Math.max(0, max - count) };
}

export async function enforceRateLimit(name: LimitName, identifier: string) {
  const { allowed } = await consumeRateLimit(name, identifier);
  if (!allowed) throw new AppError("rate_limited");
}
