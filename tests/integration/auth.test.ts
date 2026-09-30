import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { sessions, users } from "@/lib/db/schema";
import { createSession, generateSessionToken, invalidateSession, sessionIdFromToken, validateSessionToken } from "@/server/auth/session";
import { authenticateWithPassword, registerWithPassword, upsertOAuthUser } from "@/server/services/users";

describe("authentication", () => {
  it("signs up, logs in and rejects wrong passwords", async () => {
    const user = await registerWithPassword({ name: "Sara", email: "Sara@Example.com ", password: "correct horse battery" });
    expect(user.email).toBe("sara@example.com");
    expect(user.passwordHash).toMatch(/^\$argon2id\$/);
    const loggedIn = await authenticateWithPassword({ email: "SARA@example.com", password: "correct horse battery" });
    expect(loggedIn.id).toBe(user.id);
    await expect(authenticateWithPassword({ email: "sara@example.com", password: "wrong password" })).rejects.toMatchObject({ code: "invalid_credentials" });
    await expect(authenticateWithPassword({ email: "nobody@example.com", password: "whatever1" })).rejects.toMatchObject({ code: "invalid_credentials" });
  });

  it("rejects duplicate emails and weak passwords", async () => {
    await registerWithPassword({ email: "ali@example.com", password: "long enough pw" });
    await expect(registerWithPassword({ email: "ALI@example.com", password: "long enough pw" })).rejects.toMatchObject({ code: "email_taken" });
    await expect(registerWithPassword({ email: "yusuf@example.com", password: "short" })).rejects.toThrow();
  });

  it("creates, validates and invalidates sessions (logout)", async () => {
    const user = await registerWithPassword({ email: "fatima@example.com", password: "long enough pw" });
    const token = generateSessionToken();
    const session = await createSession(token, user.id);
    expect(session.id).toBe(sessionIdFromToken(token));
    expect(session.id).not.toBe(token); // raw token never stored
    expect((await validateSessionToken(token))?.user.id).toBe(user.id);
    await invalidateSession(session.id);
    expect(await validateSessionToken(token)).toBeNull();
    expect(await validateSessionToken("not-a-token")).toBeNull();
  });

  it("expires sessions and blocks suspended accounts", async () => {
    const user = await registerWithPassword({ email: "ahmed@example.com", password: "long enough pw" });
    const token = generateSessionToken();
    const session = await createSession(token, user.id);
    await db.update(sessions).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(sessions.id, session.id));
    expect(await validateSessionToken(token)).toBeNull();

    const token2 = generateSessionToken();
    await createSession(token2, user.id);
    await db.update(users).set({ status: "suspended" }).where(eq(users.id, user.id));
    expect(await validateSessionToken(token2)).toBeNull();
    await expect(authenticateWithPassword({ email: "ahmed@example.com", password: "long enough pw" })).rejects.toMatchObject({ code: "account_suspended" });
  });

  it("links OAuth identities to verified emails and refuses unverified ones", async () => {
    const existing = await registerWithPassword({ email: "maryam@example.com", password: "long enough pw" });
    const linked = await upsertOAuthUser("google", { providerUserId: "g-1", email: "maryam@example.com", emailVerified: true });
    expect(linked.id).toBe(existing.id);
    const again = await upsertOAuthUser("google", { providerUserId: "g-1", email: "changed@example.com", emailVerified: true });
    expect(again.id).toBe(existing.id);
    await expect(upsertOAuthUser("apple", { providerUserId: "a-1", email: "new@example.com", emailVerified: false })).rejects.toThrow();
  });
});
