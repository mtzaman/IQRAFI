/**
 * Khatma lifecycle: starting cycles, distributing Juz, and detecting completion.
 *
 * The database is authoritative. Every mutation of a Khatma's assignments first locks the
 * Khatma row (`SELECT … FOR UPDATE`), which serialises concurrent completions so exactly one
 * transaction observes "all 30 Juz complete" and finalises the Khatma.
 */
import { and, asc, eq, inArray, max, ne, sql } from "drizzle-orm";
import { db, type DbOrTx, type Tx } from "@/lib/db";
import { assignmentEvents, assignments, groups, khatmas } from "@/lib/db/schema";
import { distributeJuz, distributeSubset, JUZ_NUMBERS, verifyDistribution } from "@/lib/khatma/engine";
import { dateInTimezone, dueDateFor } from "@/lib/khatma/schedule";
import { AppError } from "../errors";
import { activeMembers, requireGroupPermission, type Group } from "./membership";
import { notify } from "./notifications";
import { recordKhatmaCompleted } from "./stats";

export type Khatma = typeof khatmas.$inferSelect;
export type Assignment = typeof assignments.$inferSelect;

/** Starts the next Khatma cycle for a group. Must be called inside a transaction holding the group lock. */
export async function startKhatmaCycle(tx: Tx, group: Group, opts: { startDate?: string; now?: Date } = {}): Promise<Khatma> {
  if (group.status !== "active") throw new AppError("conflict", "Group is not active");
  const [existing] = await tx.select({ id: khatmas.id }).from(khatmas).where(and(eq(khatmas.groupId, group.id), eq(khatmas.status, "active")));
  if (existing) throw new AppError("conflict", "A Khatma is already in progress");

  const [last] = await tx.select({ n: max(khatmas.cycleNumber) }).from(khatmas).where(eq(khatmas.groupId, group.id));
  const cycleNumber = (last?.n ?? 0) + 1;
  const now = opts.now ?? new Date();
  const today = dateInTimezone(now, group.timezone);
  const planned = cycleNumber === 1 && group.startDate && group.startDate > today ? group.startDate : undefined;
  const startDate = opts.startDate ?? planned ?? today;

  const [khatma] = await tx
    .insert(khatmas)
    .values({ groupId: group.id, cycleNumber, startDate, dueDate: dueDateFor(startDate, group.cycleDays) })
    .returning();

  const members = await activeMembers(tx, group.id);
  let rows: Array<typeof assignments.$inferInsert>;
  if (group.assignmentMode === "automatic" && members.length > 0) {
    const { assignments: plan } = distributeJuz(members, { cycleNumber, rotate: group.rotate });
    const problems = verifyDistribution(plan);
    if (problems.length) throw new Error(`Assignment engine invariant violated: ${problems.join(", ")}`);
    rows = plan.map((p) => ({ khatmaId: khatma!.id, juzNumber: p.juzNumber, userId: p.userId, originalUserId: p.userId, assignedAt: now }));
  } else {
    // Manual mode: every Juz starts in the group's pool for members (or admins) to claim.
    rows = JUZ_NUMBERS.map((juzNumber) => ({ khatmaId: khatma!.id, juzNumber }));
  }
  const inserted = await tx.insert(assignments).values(rows).returning();
  const assigned = inserted.filter((a) => a.userId);
  if (assigned.length) {
    await tx.insert(assignmentEvents).values(assigned.map((a) => ({ assignmentId: a.id, type: "assigned" as const, toUserId: a.userId })));
  }

  const byUser = new Map<string, number[]>();
  for (const a of assigned) byUser.set(a.userId!, [...(byUser.get(a.userId!) ?? []), a.juzNumber]);
  for (const [userId, juzList] of byUser) {
    await notify(tx, [userId], "assignment_ready", { groupId: group.id, groupName: group.name, juz: juzList[0]!, count: juzList.length });
  }
  if (!assigned.length) {
    await notify(tx, members.map((m) => m.userId), "juz_available", { groupId: group.id, groupName: group.name, count: 30 });
  }
  return khatma!;
}

/** Owner/admin action: begin the group's first Khatma, or start another after completion. */
export async function startKhatma(actorId: string, groupId: string, opts: { startDate?: string } = {}) {
  return db.transaction(async (tx) => {
    const { group } = await requireGroupPermission(tx, groupId, actorId, "khatma.start_next", { lock: true });
    return startKhatmaCycle(tx, group, opts);
  });
}

/** Locks and returns the Khatma with its group. All assignment mutations go through this. */
export async function lockKhatma(tx: Tx, khatmaId: string) {
  const [row] = await tx.select().from(khatmas).where(eq(khatmas.id, khatmaId)).for("update");
  if (!row) throw new AppError("not_found");
  const [group] = await tx.select().from(groups).where(eq(groups.id, row.groupId));
  if (!group || group.status === "deleted") throw new AppError("not_found");
  return { khatma: row, group };
}

/**
 * Checks — under the Khatma lock — whether every Juz is complete, and if so finalises the
 * Khatma exactly once. Returns true when this call completed the Khatma.
 */
export async function finalizeIfComplete(tx: Tx, khatma: Khatma, group: Group, now = new Date()): Promise<boolean> {
  if (khatma.status !== "active") return false;
  const [row] = await tx
    .select({ remaining: sql<number>`count(*) filter (where ${assignments.status} <> 'completed')::int`, total: sql<number>`count(*)::int` })
    .from(assignments)
    .where(eq(assignments.khatmaId, khatma.id));
  if (!row || row.total !== 30 || row.remaining > 0) return false;

  await tx.update(khatmas).set({ status: "completed", completedAt: now }).where(eq(khatmas.id, khatma.id));
  await recordKhatmaCompleted(tx);
  const members = await activeMembers(tx, group.id);
  await notify(tx, members.map((m) => m.userId), "khatma_completed", { groupId: group.id, groupName: group.name, khatmaId: khatma.id });

  if (group.recurring && group.status === "active" && members.length > 0) {
    await startKhatmaCycle(tx, group, { now });
  }
  return true;
}

/** Sends a single gentle "your group is making progress" note when the group passes halfway. */
export async function notifyProgressMilestone(tx: Tx, khatma: Khatma, group: Group) {
  const [row] = await tx
    .select({ done: sql<number>`count(*)::int` })
    .from(assignments)
    .where(and(eq(assignments.khatmaId, khatma.id), eq(assignments.status, "completed")));
  if (row?.done === 15) {
    const members = await activeMembers(tx, group.id);
    await notify(tx, members.map((m) => m.userId), "group_progress", { groupId: group.id, groupName: group.name, completed: 15 });
  }
}

/**
 * Redistributes Juz that nobody has started yet across the current members.
 * Useful after people join or leave mid-Khatma. Completed or in-progress Juz are never moved.
 */
export async function rebalanceKhatma(actorId: string, khatmaId: string) {
  return db.transaction(async (tx) => {
    const { khatma, group } = await lockKhatma(tx, khatmaId);
    await requireGroupPermission(tx, group.id, actorId, "assignments.reassign");
    if (khatma.status !== "active") throw new AppError("conflict");
    const open = await tx
      .select()
      .from(assignments)
      .where(and(eq(assignments.khatmaId, khatmaId), eq(assignments.status, "pending"), eq(assignments.progress, 0)))
      .orderBy(asc(assignments.juzNumber));
    const members = await activeMembers(tx, group.id);
    const plan = distributeSubset(
      open.map((a) => a.juzNumber),
      members,
    );
    const now = new Date();
    const changed = new Set<string>();
    for (const p of plan) {
      const current = open.find((a) => a.juzNumber === p.juzNumber)!;
      if (current.userId === p.userId) continue;
      await tx.update(assignments).set({ userId: p.userId, assignedAt: now, helpRequestedAt: null }).where(eq(assignments.id, current.id));
      await tx.insert(assignmentEvents).values({ assignmentId: current.id, type: "reassigned", fromUserId: current.userId, toUserId: p.userId, actorId });
      changed.add(p.userId);
    }
    for (const userId of changed) {
      const first = plan.find((p) => p.userId === userId)!;
      await notify(tx, [userId], "assignment_ready", { groupId: group.id, groupName: group.name, juz: first.juzNumber, count: plan.filter((p) => p.userId === userId).length });
    }
    return { moved: changed.size, considered: open.length };
  });
}

/** Releases a user's unfinished Juz in all active Khatmas of a group back to the pool. */
export async function releaseUnfinishedForUser(tx: Tx, group: Group, userId: string, actorId: string) {
  const active = await tx.select().from(khatmas).where(and(eq(khatmas.groupId, group.id), eq(khatmas.status, "active")));
  const released: number[] = [];
  for (const k of active) {
    await tx.select({ id: khatmas.id }).from(khatmas).where(eq(khatmas.id, k.id)).for("update");
    const rows = await tx
      .update(assignments)
      .set({ userId: null, helpRequestedAt: null, status: "pending", progress: 0, lastAyahId: null, assignedAt: null })
      .where(and(eq(assignments.khatmaId, k.id), eq(assignments.userId, userId), ne(assignments.status, "completed")))
      .returning();
    if (rows.length) {
      await tx.insert(assignmentEvents).values(rows.map((r) => ({ assignmentId: r.id, type: "released" as const, fromUserId: userId, actorId })));
      released.push(...rows.map((r) => r.juzNumber));
    }
  }
  return released.sort((a, b) => a - b);
}

export async function getKhatmaWithAssignments(khatmaId: string) {
  const [khatma] = await db.select().from(khatmas).where(eq(khatmas.id, khatmaId));
  if (!khatma) return null;
  const rows = await db.select().from(assignments).where(eq(assignments.khatmaId, khatmaId)).orderBy(asc(assignments.juzNumber));
  return { khatma, assignments: rows };
}

export async function khatmaIdsForGroups(groupIds: string[]) {
  if (!groupIds.length) return [];
  return db.select().from(khatmas).where(inArray(khatmas.groupId, groupIds));
}
