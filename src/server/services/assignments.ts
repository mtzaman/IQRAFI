/**
 * Assignment actions: reading progress, completion, asking for help, releasing,
 * volunteering and admin reassignment.
 *
 * Principles:
 *  - completion requires a deliberate action and is idempotent (safe to retry after a network failure),
 *  - progress from reading never marks a Juz complete (it is capped at 99%),
 *  - unfinished Juz are never silently left without a path to completion,
 *  - nobody is publicly named for being behind.
 */
import { and, eq, isNull, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { assignmentEvents, assignments, ayahs, groupMembers, juz, khatmas, readingProgress, users } from "@/lib/db/schema";
import { dateInTimezone } from "@/lib/khatma/schedule";
import { AppError } from "../errors";
import { finalizeIfComplete, lockKhatma, notifyProgressMilestone } from "./khatmas";
import { activeMembers, requireGroupPermission } from "./membership";
import { notify } from "./notifications";
import { recordJuzCompleted } from "./stats";

async function loadAssignment(assignmentId: string) {
  const [row] = await db.select({ khatmaId: assignments.khatmaId }).from(assignments).where(eq(assignments.id, assignmentId));
  if (!row) throw new AppError("not_found");
  return row;
}

export interface CompletionResult {
  alreadyCompleted: boolean;
  khatmaCompleted: boolean;
  khatmaId: string;
  groupId: string;
  juzNumber: number;
}

export async function completeAssignment(actorId: string, assignmentId: string, now = new Date()): Promise<CompletionResult> {
  const { khatmaId } = await loadAssignment(assignmentId);
  return db.transaction(async (tx) => {
    const { khatma, group } = await lockKhatma(tx, khatmaId);
    await requireGroupPermission(tx, group.id, actorId, "assignment.complete_own");
    const [a] = await tx.select().from(assignments).where(eq(assignments.id, assignmentId));
    if (!a) throw new AppError("not_found");
    const base = { khatmaId, groupId: group.id, juzNumber: a.juzNumber };
    if (a.status === "completed") {
      // Duplicate request (double tap, retry after network failure): succeed without side effects.
      return { ...base, alreadyCompleted: true, khatmaCompleted: khatma.status === "completed" };
    }
    if (a.userId !== actorId) throw new AppError("forbidden");
    if (khatma.status !== "active") throw new AppError("conflict");

    await tx
      .update(assignments)
      .set({ status: "completed", progress: 100, completedAt: now, completedBy: actorId, helpRequestedAt: null, startedAt: a.startedAt ?? now })
      .where(eq(assignments.id, assignmentId));
    await tx.insert(assignmentEvents).values({ assignmentId, type: "completed", toUserId: actorId, actorId });
    await recordJuzCompleted(tx);
    const khatmaCompleted = await finalizeIfComplete(tx, khatma, group, now);
    if (!khatmaCompleted) await notifyProgressMilestone(tx, khatma, group);
    return { ...base, alreadyCompleted: false, khatmaCompleted };
  });
}

/** Records the reader's position. Assignment progress only ever moves forward and stops at 99%. */
export async function recordReadingPosition(userId: string, ayahId: number) {
  const [ayah] = await db.select({ id: ayahs.id, juz: ayahs.juz }).from(ayahs).where(eq(ayahs.id, ayahId));
  if (!ayah) throw new AppError("validation");
  const [j] = await db.select().from(juz).where(eq(juz.number, ayah.juz));
  const progress = Math.min(100, Math.max(0, Math.round(((ayah.id - j!.firstAyahId + 1) / j!.ayahCount) * 100)));
  const capped = Math.min(progress, 99);

  await db.transaction(async (tx) => {
    await tx
      .insert(readingProgress)
      .values({ userId, juzNumber: ayah.juz, ayahId, progress })
      .onConflictDoUpdate({
        target: [readingProgress.userId, readingProgress.juzNumber],
        set: { ayahId, progress: sql`greatest(${readingProgress.progress}, ${progress})`, updatedAt: new Date() },
      });
    await tx.update(users).set({ lastReadAyahId: ayahId }).where(eq(users.id, userId));
    await tx
      .update(assignments)
      .set({
        progress: sql`greatest(${assignments.progress}, ${capped})`,
        status: "in_progress",
        startedAt: sql`coalesce(${assignments.startedAt}, now())`,
        lastAyahId: ayahId,
      })
      .where(
        and(
          eq(assignments.userId, userId),
          eq(assignments.juzNumber, ayah.juz),
          ne(assignments.status, "completed"),
          sql`${assignments.khatmaId} in (select id from khatmas where status = 'active')`,
        ),
      );
  });
  return { juzNumber: ayah.juz, progress };
}

/** "Ask Group for Help": marks the Juz as open to volunteers without naming the reader. */
export async function requestHelp(actorId: string, assignmentId: string) {
  const { khatmaId } = await loadAssignment(assignmentId);
  return db.transaction(async (tx) => {
    const { khatma, group } = await lockKhatma(tx, khatmaId);
    await requireGroupPermission(tx, group.id, actorId, "assignment.read_own");
    const [a] = await tx.select().from(assignments).where(eq(assignments.id, assignmentId));
    if (!a || a.userId !== actorId) throw new AppError("forbidden");
    if (a.status === "completed" || khatma.status !== "active") throw new AppError("conflict");
    if (a.helpRequestedAt) return a;
    const [updated] = await tx.update(assignments).set({ helpRequestedAt: new Date() }).where(eq(assignments.id, assignmentId)).returning();
    await tx.insert(assignmentEvents).values({ assignmentId, type: "help_requested", fromUserId: actorId, actorId });
    const others = (await activeMembers(tx, group.id)).map((m) => m.userId).filter((id) => id !== actorId);
    await notify(tx, others, "help_requested", { groupId: group.id, groupName: group.name, juz: a.juzNumber });
    return updated!;
  });
}

/** "Allow someone else to complete it": returns the Juz to the group's pool. */
export async function releaseAssignment(actorId: string, assignmentId: string) {
  const { khatmaId } = await loadAssignment(assignmentId);
  return db.transaction(async (tx) => {
    const { khatma, group } = await lockKhatma(tx, khatmaId);
    await requireGroupPermission(tx, group.id, actorId, "assignment.read_own");
    const [a] = await tx.select().from(assignments).where(eq(assignments.id, assignmentId));
    if (!a || a.userId !== actorId) throw new AppError("forbidden");
    if (a.status === "completed" || khatma.status !== "active") throw new AppError("conflict");
    await tx
      .update(assignments)
      .set({ userId: null, helpRequestedAt: null, status: "pending", progress: 0, lastAyahId: null, assignedAt: null })
      .where(eq(assignments.id, assignmentId));
    await tx.insert(assignmentEvents).values({ assignmentId, type: "released", fromUserId: actorId, actorId });
    const others = (await activeMembers(tx, group.id)).map((m) => m.userId).filter((id) => id !== actorId);
    await notify(tx, others, "juz_available", { groupId: group.id, groupName: group.name, juz: a.juzNumber, count: 1 });
  });
}

/**
 * "Help complete this Juz": a member claims a Juz that is in the pool, has a help request,
 * or is still unfinished after the Khatma's due date. Concurrent claims are safe: the
 * Khatma lock serialises them and the second claimant receives `already_claimed`.
 */
export async function claimAssignment(actorId: string, assignmentId: string, now = new Date()) {
  const { khatmaId } = await loadAssignment(assignmentId);
  return db.transaction(async (tx) => {
    const { khatma, group } = await lockKhatma(tx, khatmaId);
    await requireGroupPermission(tx, group.id, actorId, "assignment.volunteer");
    const [a] = await tx.select().from(assignments).where(eq(assignments.id, assignmentId));
    if (!a) throw new AppError("not_found");
    if (khatma.status !== "active") throw new AppError("conflict");
    if (a.status === "completed") throw new AppError("already_claimed");
    if (a.userId === actorId) return a;
    const overdue = dateInTimezone(now, group.timezone) > khatma.dueDate;
    const claimable = a.userId === null || a.helpRequestedAt !== null || overdue;
    if (!claimable) throw new AppError("already_claimed");

    const previous = a.userId;
    const [updated] = await tx
      .update(assignments)
      .set({ userId: actorId, helpRequestedAt: null, status: "pending", progress: 0, lastAyahId: null, assignedAt: now })
      .where(eq(assignments.id, assignmentId))
      .returning();
    await tx.insert(assignmentEvents).values({
      assignmentId,
      type: previous ? "volunteered" : "claimed",
      fromUserId: previous,
      toUserId: actorId,
      actorId,
    });
    if (previous) {
      const [helper] = await tx.select({ name: users.name }).from(users).where(eq(users.id, actorId));
      await notify(tx, [previous], "assignment_taken_over", { groupId: group.id, groupName: group.name, juz: a.juzNumber, helper: helper?.name ?? null });
    }
    return updated!;
  });
}

/** Owner/admin: assign a Juz to a specific member, or return it to the pool (`toUserId = null`). */
export async function reassignAssignment(actorId: string, assignmentId: string, toUserId: string | null) {
  const { khatmaId } = await loadAssignment(assignmentId);
  return db.transaction(async (tx) => {
    const { khatma, group } = await lockKhatma(tx, khatmaId);
    await requireGroupPermission(tx, group.id, actorId, "assignments.reassign");
    const [a] = await tx.select().from(assignments).where(eq(assignments.id, assignmentId));
    if (!a) throw new AppError("not_found");
    if (a.status === "completed" || khatma.status !== "active") throw new AppError("conflict");
    if (a.userId === toUserId) return a;
    if (toUserId) {
      const [target] = await tx
        .select()
        .from(groupMembers)
        .where(and(eq(groupMembers.groupId, group.id), eq(groupMembers.userId, toUserId), eq(groupMembers.status, "active")));
      if (!target) throw new AppError("validation", "Target is not a member");
    }
    const [updated] = await tx
      .update(assignments)
      .set({ userId: toUserId, helpRequestedAt: null, status: "pending", progress: 0, lastAyahId: null, assignedAt: toUserId ? new Date() : null })
      .where(eq(assignments.id, assignmentId))
      .returning();
    await tx.insert(assignmentEvents).values({ assignmentId, type: toUserId ? "reassigned" : "released", fromUserId: a.userId, toUserId, actorId });
    if (toUserId) await notify(tx, [toUserId], "assignment_ready", { groupId: group.id, groupName: group.name, juz: a.juzNumber, count: 1 });
    if (a.userId && a.userId !== actorId) {
      await notify(tx, [a.userId], "assignment_taken_over", { groupId: group.id, groupName: group.name, juz: a.juzNumber, helper: null });
    }
    return updated!;
  });
}

/** Juz in the pool of a user's active Khatmas that they can pick up (for the home screen). */
export async function openJuzForUser(userId: string) {
  return db
    .select({ assignmentId: assignments.id, juzNumber: assignments.juzNumber, khatmaId: khatmas.id, groupId: khatmas.groupId })
    .from(assignments)
    .innerJoin(khatmas, eq(khatmas.id, assignments.khatmaId))
    .innerJoin(groupMembers, and(eq(groupMembers.groupId, khatmas.groupId), eq(groupMembers.userId, userId), eq(groupMembers.status, "active")))
    .where(and(eq(khatmas.status, "active"), isNull(assignments.userId), ne(assignments.status, "completed")));
}


