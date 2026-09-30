import { NextResponse, type NextRequest } from "next/server";
import { getCurrentSession } from "@/server/auth/current";
import { isAppError } from "@/server/errors";
import { consumeRateLimit } from "@/server/rate-limit";
import { recordReadingPosition } from "@/server/services/assignments";
import { readingPositionSchema } from "@/lib/validation";

/** CSRF defence for this cookie-authenticated JSON endpoint: require a same-origin request. */
function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return request.headers.get("sec-fetch-site") === "same-origin";
  try {
    return new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(await consumeRateLimit("progress", session.user.id)).allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  let body: unknown;
  try {
    body = JSON.parse(await request.text());
  } catch {
    return NextResponse.json({ error: "validation" }, { status: 400 });
  }
  const parsed = readingPositionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "validation" }, { status: 400 });
  try {
    const result = await recordReadingPosition(session.user.id, parsed.data.ayahId);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    if (isAppError(e)) return NextResponse.json({ error: e.code }, { status: 400 });
    console.error("[reading-progress]", e);
    return NextResponse.json({ error: "generic" }, { status: 500 });
  }
}
