import { NextResponse, type NextRequest } from "next/server";

const PROTECTED = ["/home", "/groups", "/profile", "/notifications", "/khatma", "/admin"];
const SESSION_COOKIE = "iqrafi_session";

/**
 * Edge gate: an optimistic check for a session cookie on private routes. The session itself
 * is always validated against the database on the server (see requireUser); this only avoids
 * rendering private pages for obviously anonymous visitors and records the requested path.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const headers = new Headers(request.headers);
  headers.set("x-iqrafi-path", pathname + search);
  const isProtected = PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (isProtected && !request.cookies.has(SESSION_COOKIE)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest|api/).*)"],
};
