import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createSession, generateSessionToken, invalidateSession, SESSION_DURATION_MS, validateSessionToken } from "./session";

export const SESSION_COOKIE = "iqrafi_session";

/** Validates the session cookie once per request. */
export const getCurrentSession = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return validateSessionToken(token);
});

export async function getCurrentUser() {
  return (await getCurrentSession())?.user ?? null;
}

/** For pages: redirects anonymous visitors to sign in, returning afterwards. */
export async function requireUser() {
  const session = await getCurrentSession();
  if (!session) {
    const path = (await headers()).get("x-iqrafi-path") ?? "/home";
    redirect(`/login?next=${encodeURIComponent(path)}`);
  }
  return session.user;
}

export async function startSession(userId: string) {
  const token = generateSessionToken();
  const session = await createSession(token, userId);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(Date.now() + SESSION_DURATION_MS),
  });
  return session;
}

export async function endSession() {
  const session = await getCurrentSession();
  if (session) await invalidateSession(session.session.id);
  (await cookies()).delete(SESSION_COOKIE);
}

/** Only allow same-site relative redirects after sign-in (prevents open redirects). */
export function safeNextPath(next: unknown, fallback = "/home"): string {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}
