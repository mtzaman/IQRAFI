/**
 * Lightweight moderation: reports, user blocks and admin resolution.
 * Deliberately minimal — IQRAFI is a worship tool, not a social network.
 */
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { dedications, groups, khatmas, reports, sessions, userBlocks, users } from "@/lib/db/schema";
import { reportSchema } from "@/lib/validation";
import { AppError } from "../errors";

export async function createReport(reporterId: string, input: unknown) {
  const v = reportSchema.parse(input);
  const [row] = await db.insert(reports).values({ reporterId, ...v }).returning();
  return row!;
}

export async function blockUser(blockerId: string, blockedId: string) {
  if (blockerId === blockedId) throw new AppError("validation");
  await db.insert(userBlocks).values({ blockerId, blockedId }).onConflictDoNothing();
}

export async function unblockUser(blockerId: string, blockedId: string) {
  await db.delete(userBlocks).where(and(eq(userBlocks.blockerId, blockerId), eq(userBlocks.blockedId, blockedId)));
}

export async function requirePlatformAdmin(userId: string) {
  const [user] = await db.select({ role: users.platformRole, status: users.status }).from(users).where(eq(users.id, userId));
  if (user?.role !== "admin" || user.status !== "active") throw new AppError("forbidden");
}

export async function listReports(adminId: string, status: "open" | "resolved" | "dismissed" = "open") {
  await requirePlatformAdmin(adminId);
  return db.select().from(reports).where(eq(reports.status, status)).orderBy(desc(reports.createdAt)).limit(100);
}

export type ModerationAction = "dismiss" | "hide_dedication" | "remove_group" | "suspend_user";

export async function resolveReport(adminId: string, reportId: string, action: ModerationAction) {
  await requirePlatformAdmin(adminId);
  await db.transaction(async (tx) => {
    const [report] = await tx.select().from(reports).where(eq(reports.id, reportId)).for("update");
    if (!report) throw new AppError("not_found");
    if (action === "hide_dedication" && report.targetType === "dedication") {
      await tx.update(dedications).set({ hiddenByModeratorAt: new Date() }).where(eq(dedications.id, report.targetId));
    } else if (action === "remove_group" && report.targetType === "group") {
      await tx.update(groups).set({ status: "deleted", deletedAt: new Date() }).where(eq(groups.id, report.targetId));
      await tx.update(khatmas).set({ status: "cancelled" }).where(and(eq(khatmas.groupId, report.targetId), eq(khatmas.status, "active")));
    } else if (action === "suspend_user" && report.targetType === "user") {
      await tx.update(users).set({ status: "suspended" }).where(eq(users.id, report.targetId));
      await tx.delete(sessions).where(eq(sessions.userId, report.targetId));
    } else if (action !== "dismiss") {
      throw new AppError("validation");
    }
    await tx
      .update(reports)
      .set({ status: action === "dismiss" ? "dismissed" : "resolved", resolvedBy: adminId, resolvedAt: new Date() })
      .where(eq(reports.id, reportId));
  });
}

export async function setUserSuspended(adminId: string, userId: string, suspended: boolean) {
  await requirePlatformAdmin(adminId);
  if (adminId === userId) throw new AppError("validation");
  await db.update(users).set({ status: suspended ? "suspended" : "active" }).where(eq(users.id, userId));
  if (suspended) await db.delete(sessions).where(eq(sessions.userId, userId));
}

export async function adminOverview(adminId: string) {
  await requirePlatformAdmin(adminId);
  const one = async (q: Promise<Array<{ n: number }>>) => (await q)[0]?.n ?? 0;
  const count = sql<number>`count(*)::int`;
  const [usersTotal, usersNew7d, groupsActive, khatmasActive, khatmasCompleted, reportsOpen, dbNow] = await Promise.all([
    one(db.select({ n: count }).from(users)),
    one(db.select({ n: count }).from(users).where(sql`${users.createdAt} > now() - interval '7 days'`)),
    one(db.select({ n: count }).from(groups).where(eq(groups.status, "active"))),
    one(db.select({ n: count }).from(khatmas).where(eq(khatmas.status, "active"))),
    one(db.select({ n: count }).from(khatmas).where(eq(khatmas.status, "completed"))),
    one(db.select({ n: count }).from(reports).where(eq(reports.status, "open"))),
    db.execute<{ now: string }>(sql`select now()::text as now`),
  ]);
  const recentUsers = await db
    .select({ id: users.id, name: users.name, email: users.email, status: users.status, createdAt: users.createdAt, isDemo: users.isDemo })
    .from(users)
    .orderBy(desc(users.createdAt))
    .limit(25);
  return { usersTotal, usersNew7d, groupsActive, khatmasActive, khatmasCompleted, reportsOpen, dbTime: dbNow.rows[0]?.now ?? null, recentUsers };
}
