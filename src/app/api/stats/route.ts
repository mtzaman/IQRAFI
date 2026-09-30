import { NextResponse } from "next/server";
import { getGlobalStats } from "@/server/services/stats";

/** Public aggregate statistics (no personal data). Cached briefly at the edge. */
export async function GET() {
  const stats = await getGlobalStats();
  return NextResponse.json(stats, { headers: { "cache-control": "public, s-maxage=60, stale-while-revalidate=300" } });
}
