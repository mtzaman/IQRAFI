/**
 * Database-backed sessions (the pattern recommended by the Lucia project).
 * The cookie holds a random 160-bit token; the database stores only its SHA-256 hash,
 * so a leaked database cannot be used to hijack sessions.
 */
import { sha256 } from "@oslojs/crypto/sha2";
import { encodeBase32LowerCaseNoPadding, encodeHexLowerCase } from "@oslojs/encoding";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { sessions, users } from "@/lib/db/schema";

export const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30;
const RENEW_THRESHOLD_MS = 1000 * 60 * 60 * 24 * 15;

export type SessionUser = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;

export function generateSessionToken(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return encodeBase32LowerCaseNoPadding(bytes);
}

export function sessionIdFromToken(token: string): string {
  return encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
}

export async function createSession(token: string, userId: string): Promise<Session> {
  const session = { id: sessionIdFromToken(token), userId, expiresAt: new Date(Date.now() + SESSION_DURATION_MS) };
  const [row] = await db.insert(sessions).values(session).returning();
  return row!;
}

export async function validateSessionToken(token: string): Promise<{ session: Session; user: SessionUser } | null> {
  if (!/^[a-z2-7]{32}$/.test(token)) return null;
  const id = sessionIdFromToken(token);
  const [row] = await db.select({ session: sessions, user: users }).from(sessions).innerJoin(users, eq(sessions.userId, users.id)).where(eq(sessions.id, id));
  if (!row) return null;
  const { session, user } = row;
  if (Date.now() >= session.expiresAt.getTime() || user.status !== "active") {
    await db.delete(sessions).where(eq(sessions.id, id));
    return null;
  }
  if (Date.now() >= session.expiresAt.getTime() - RENEW_THRESHOLD_MS) {
    session.expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
    await db.update(sessions).set({ expiresAt: session.expiresAt }).where(eq(sessions.id, id));
  }
  return { session, user };
}

export async function invalidateSession(sessionId: string) {
  await db.delete(sessions).where(eq(sessions.id, sessionId));
}

export async function invalidateAllUserSessions(userId: string) {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}
