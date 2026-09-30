import { generateState } from "arctic";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/server/auth/current";
import { appleProvider } from "@/server/auth/oauth";

// Apple posts the callback cross-site (response_mode=form_post), so these cookies must be SameSite=None.
const cookieOpts = { httpOnly: true, sameSite: "none" as const, secure: true, path: "/", maxAge: 600 };

export async function GET(request: NextRequest) {
  const apple = appleProvider();
  if (!apple) return NextResponse.redirect(new URL("/login?error=oauth", request.url));
  const state = generateState();
  const url = apple.createAuthorizationURL(state, ["name", "email"]);
  url.searchParams.set("response_mode", "form_post");
  const jar = await cookies();
  jar.set("apple_oauth_state", state, cookieOpts);
  jar.set("apple_oauth_next", safeNextPath(request.nextUrl.searchParams.get("next")), cookieOpts);
  return NextResponse.redirect(url);
}
