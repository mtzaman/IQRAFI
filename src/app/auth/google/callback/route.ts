import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath, startSession } from "@/server/auth/current";
import { decodeIdTokenClaims, googleProvider } from "@/server/auth/oauth";
import { upsertOAuthUser } from "@/server/services/users";

export async function GET(request: NextRequest) {
  const google = googleProvider();
  const jar = await cookies();
  const fail = () => NextResponse.redirect(new URL("/login?error=oauth", request.url));
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const storedState = jar.get("oauth_state")?.value;
  const verifier = jar.get("oauth_verifier")?.value;
  const next = safeNextPath(jar.get("oauth_next")?.value);
  jar.delete("oauth_state");
  jar.delete("oauth_verifier");
  jar.delete("oauth_next");
  if (!google || !code || !state || !storedState || !verifier || state !== storedState) return fail();
  try {
    const tokens = await google.validateAuthorizationCode(code, verifier);
    // The ID token comes straight from Google's token endpoint over TLS in exchange for our code.
    const claims = decodeIdTokenClaims(tokens.idToken());
    const user = await upsertOAuthUser("google", {
      providerUserId: String(claims.sub),
      email: String(claims.email ?? ""),
      emailVerified: claims.email_verified === true,
      name: typeof claims.name === "string" ? claims.name : null,
      avatarUrl: typeof claims.picture === "string" ? claims.picture : null,
    });
    await startSession(user.id);
    return NextResponse.redirect(new URL(next, request.url));
  } catch (e) {
    console.error("[oauth:google]", e);
    return fail();
  }
}
