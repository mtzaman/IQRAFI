import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { refreshGlobalStats } from "@/server/services/stats";

/**
 * Scheduled reconciliation of global statistics (e.g. Vercel Cron every 5 minutes).
 * Protected by CRON_SECRET sent as a Bearer token.
 */
async function handle(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  if (!secret || auth.length !== expected.length || !timingSafeEqual(Buffer.from(auth), Buffer.from(expected))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  await refreshGlobalStats();
  return NextResponse.json({ ok: true, refreshedAt: new Date().toISOString() });
}

export const GET = handle;
export const POST = handle;
