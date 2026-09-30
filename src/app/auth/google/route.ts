import { generateCodeVerifier, generateState } from "arctic";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/server/auth/current";
import { googleProvider } from "@/server/auth/oauth";

const cookieOpts = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 600 };

export async function GET(request: NextRequest) {
  const google = googleProvider();
  if (!google) return NextResponse.redirect(new URL("/login?error=oauth", request.url));
  const state = generateState();
  const verifier = generateCodeVerifier();
  const url = google.createAuthorizationURL(state, verifier, ["openid", "email", "profile"]);
  const jar = await cookies();
  jar.set("oauth_state", state, cookieOpts);
  jar.set("oauth_verifier", verifier, cookieOpts);
  jar.set("oauth_next", safeNextPath(request.nextUrl.searchParams.get("next")), cookieOpts);
  return NextResponse.redirect(url);
}
