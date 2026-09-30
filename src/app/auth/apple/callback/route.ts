import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath, startSession } from "@/server/auth/current";
import { appleProvider, decodeIdTokenClaims } from "@/server/auth/oauth";
import { upsertOAuthUser } from "@/server/services/users";

export async function POST(request: NextRequest) {
  const apple = appleProvider();
  const jar = await cookies();
  const fail = () => NextResponse.redirect(new URL("/login?error=oauth", request.url), 303);
  const form = await request.formData();
  const code = form.get("code");
  const state = form.get("state");
  const storedState = jar.get("apple_oauth_state")?.value;
  const next = safeNextPath(jar.get("apple_oauth_next")?.value);
  jar.delete("apple_oauth_state");
  jar.delete("apple_oauth_next");
  if (!apple || typeof code !== "string" || typeof state !== "string" || !storedState || state !== storedState) return fail();
  try {
    const tokens = await apple.validateAuthorizationCode(code);
    const claims = decodeIdTokenClaims(tokens.idToken());
    let name: string | null = null;
    const rawUser = form.get("user");
    if (typeof rawUser === "string") {
      const parsed = JSON.parse(rawUser) as { name?: { firstName?: string; lastName?: string } };
      name = [parsed.name?.firstName, parsed.name?.lastName].filter(Boolean).join(" ") || null;
    }
    const user = await upsertOAuthUser("apple", {
      providerUserId: String(claims.sub),
      email: String(claims.email ?? ""),
      emailVerified: claims.email_verified === true || claims.email_verified === "true",
      name,
    });
    await startSession(user.id);
    return NextResponse.redirect(new URL(next, request.url), 303);
  } catch (e) {
    console.error("[oauth:apple]", e);
    return fail();
  }
}
