/**
 * Accounts: registration, sign-in, OAuth linking, profile, privacy (export & deletion).
 */
import { and, asc, eq, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  assignments,
  bookmarks,
  dedications,
  groupMembers,
  groups,
  notifications,
  oauthAccounts,
  readingProgress,
  users,
} from "@/lib/db/schema";
import { loginSchema, preferencesSchema, profileSchema, signupSchema } from "@/lib/validation";
import { hashPassword, verifyPassword } from "../auth/password";
import { AppError } from "../errors";
import { releaseUnfinishedForUser } from "./khatmas";
import { memberIdsWithRoles } from "./membership";
import { notify } from "./notifications";

export type User = typeof users.$inferSelect;

// Used to equalise timing when an email does not exist.
let dummyHash: Promise<string> | undefined;

export async function registerWithPassword(input: { name?: string | null; email: string; password: string }, extra: { language?: "en" | "ar" | "ur"; timezone?: string } = {}) {
  const v = signupSchema.parse(input);
  const [existing] = await db.select({ id: users.id }).from(users).where(sql`lower(${users.email}) = ${v.email}`);
  if (existing) throw new AppError("email_taken");
  const passwordHash = await hashPassword(v.password);
  try {
    const [user] = await db
      .insert(users)
      .values({ email: v.email, name: v.name, passwordHash, language: extra.language ?? "en", timezone: extra.timezone ?? "UTC" })
      .returning();
    return user!;
  } catch (e) {
    if ((e as { code?: string }).code === "23505" || (e as { cause?: { code?: string } }).cause?.code === "23505") throw new AppError("email_taken");
    throw e;
  }
}

export async function authenticateWithPassword(input: { email: string; password: string }) {
  const v = loginSchema.parse(input);
  const [user] = await db.select().from(users).where(sql`lower(${users.email}) = ${v.email}`);
  if (!user?.passwordHash) {
    dummyHash ??= hashPassword("timing-equaliser-password");
    await verifyPassword(await dummyHash, v.password);
    throw new AppError("invalid_credentials");
  }
  if (!(await verifyPassword(user.passwordHash, v.password))) throw new AppError("invalid_credentials");
  if (user.status !== "active") throw new AppError("account_suspended");
  return user;
}

/** Finds or creates the user for a verified OAuth identity. Links by verified email when possible. */
export async function upsertOAuthUser(provider: "google" | "apple", profile: { providerUserId: string; email: string; emailVerified: boolean; name?: string | null; avatarUrl?: string | null }) {
  return db.transaction(async (tx) => {
    const [linked] = await tx
      .select({ user: users })
      .from(oauthAccounts)
      .innerJoin(users, eq(users.id, oauthAccounts.userId))
      .where(and(eq(oauthAccounts.provider, provider), eq(oauthAccounts.providerUserId, profile.providerUserId)));
    if (linked) return linked.user;
    const email = profile.email.trim().toLowerCase();
    let [user] = profile.emailVerified ? await tx.select().from(users).where(sql`lower(${users.email}) = ${email}`) : [];
    if (!user) {
      if (!profile.emailVerified) throw new AppError("validation", "Email not verified by provider");
      [user] = await tx.insert(users).values({ email, name: profile.name ?? null, avatarUrl: profile.avatarUrl ?? null, emailVerifiedAt: new Date() }).returning();
    }
    await tx.insert(oauthAccounts).values({ provider, providerUserId: profile.providerUserId, userId: user!.id });
    return user!;
  });
}

export async function getUser(userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  return user ?? null;
}

export async function updateProfile(userId: string, input: unknown) {
  const v = profileSchema.parse(input);
  const [user] = await db.update(users).set(v).where(eq(users.id, userId)).returning();
  return user!;
}

export async function updatePreferences(userId: string, input: unknown) {
  const v = preferencesSchema.parse(input);
  const [user] = await db.update(users).set(v).where(eq(users.id, userId)).returning();
  return user!;
}

export async function markOnboarded(userId: string) {
  await db.update(users).set({ onboardedAt: new Date() }).where(eq(users.id, userId));
}

export async function changePassword(userId: string, current: string | null, next: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) throw new AppError("not_found");
  if (user.passwordHash && !(current && (await verifyPassword(user.passwordHash, current)))) throw new AppError("invalid_credentials");
  const passwordHash = await hashPassword(signupSchema.shape.password.parse(next));
  await db.update(users).set({ passwordHash }).where(eq(users.id, userId));
}

/** GDPR-style export of everything IQRAFI stores about a user. */
export async function exportUserData(userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) throw new AppError("not_found");
  const { passwordHash: _omit, ...profile } = user;
  void _omit;
  return {
    exportedAt: new Date().toISOString(),
    profile,
    oauthAccounts: await db.select({ provider: oauthAccounts.provider, createdAt: oauthAccounts.createdAt }).from(oauthAccounts).where(eq(oauthAccounts.userId, userId)),
    memberships: await db
      .select({ group: groups.name, role: groupMembers.role, status: groupMembers.status, joinedAt: groupMembers.joinedAt, leftAt: groupMembers.leftAt })
      .from(groupMembers)
      .innerJoin(groups, eq(groups.id, groupMembers.groupId))
      .where(eq(groupMembers.userId, userId)),
    assignments: await db
      .select({ juz: assignments.juzNumber, status: assignments.status, progress: assignments.progress, assignedAt: assignments.assignedAt, completedAt: assignments.completedAt })
      .from(assignments)
      .where(eq(assignments.userId, userId)),
    readingProgress: await db.select().from(readingProgress).where(eq(readingProgress.userId, userId)),
    dedications: await db.select().from(dedications).where(eq(dedications.userId, userId)),
    bookmarks: await db.select().from(bookmarks).where(eq(bookmarks.userId, userId)),
    notifications: await db.select().from(notifications).where(eq(notifications.userId, userId)),
  };
}

/**
 * Permanently deletes an account. Unfinished Juz are returned to their groups' pools (never
 * silently lost), ownership passes to the longest-standing admin or member, and groups with
 * nobody left are closed. Completed Juz remain counted in anonymous aggregate statistics.
 */
export async function deleteAccount(userId: string) {
  await db.transaction(async (tx) => {
    const memberships = await tx
      .select({ m: groupMembers, group: groups })
      .from(groupMembers)
      .innerJoin(groups, eq(groups.id, groupMembers.groupId))
      .where(and(eq(groupMembers.userId, userId), eq(groupMembers.status, "active"), ne(groups.status, "deleted")));
    for (const { m, group } of memberships) {
      await tx.select({ id: groups.id }).from(groups).where(eq(groups.id, group.id)).for("update");
      const released = await releaseUnfinishedForUser(tx, group, userId, userId);
      if (m.role === "owner") {
        const [successor] = await tx
          .select()
          .from(groupMembers)
          .where(and(eq(groupMembers.groupId, group.id), eq(groupMembers.status, "active"), ne(groupMembers.userId, userId)))
          .orderBy(sql`case when ${groupMembers.role} = 'admin' then 0 else 1 end`, asc(groupMembers.joinedAt))
          .limit(1);
        if (successor) {
          await tx.update(groupMembers).set({ role: "owner" }).where(eq(groupMembers.id, successor.id));
          await tx.update(groups).set({ ownerId: successor.userId }).where(eq(groups.id, group.id));
        } else {
          await tx.update(groups).set({ status: "deleted", deletedAt: new Date() }).where(eq(groups.id, group.id));
          continue;
        }
      }
      const admins = (await memberIdsWithRoles(tx, group.id, ["owner", "admin"])).filter((id) => id !== userId);
      await notify(tx, admins, "member_left", { groupId: group.id, groupName: group.name, released: released.join(", ") || null });
    }
    await tx.delete(users).where(eq(users.id, userId));
  });
}
