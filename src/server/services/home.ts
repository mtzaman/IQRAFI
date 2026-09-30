/**
 * Read models for the home screen and the personal "Your Qur'an journey" page.
 */
import { and, asc, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { assignments, groupMembers, groups, khatmas, readingProgress } from "@/lib/db/schema";
import { dateInTimezone, daysBetween } from "@/lib/khatma/schedule";

export interface KhatmaSummary {
  groupId: string;
  groupName: string;
  groupKind: "standard" | "ramadan";
  timezone: string;
  khatmaId: string;
  cycleNumber: number;
  startDate: string;
  dueDate: string;
  juzCompleted: number;
  readers: number;
  readersDone: number;
  /** 1-based day within the cycle, in the group's timezone. */
  dayOfCycle: number;
  cycleDays: number;
  myAssignments: Array<{ id: string; juzNumber: number; status: string; progress: number; helpRequestedAt: Date | null }>;
  openJuz: Array<{ id: string; juzNumber: number; help: boolean }>;
}

export async function getActiveKhatmaSummaries(userId: string, now = new Date()): Promise<KhatmaSummary[]> {
  const rows = await db
    .select({ group: groups, khatma: khatmas })
    .from(groupMembers)
    .innerJoin(groups, eq(groups.id, groupMembers.groupId))
    .innerJoin(khatmas, and(eq(khatmas.groupId, groups.id), eq(khatmas.status, "active")))
    .where(and(eq(groupMembers.userId, userId), eq(groupMembers.status, "active"), eq(groups.status, "active")))
    .orderBy(asc(khatmas.dueDate));
  if (!rows.length) return [];
  const all = await db
    .select()
    .from(assignments)
    .where(inArray(assignments.khatmaId, rows.map((r) => r.khatma.id)))
    .orderBy(asc(assignments.juzNumber));

  return rows.map(({ group, khatma }) => {
    const list = all.filter((a) => a.khatmaId === khatma.id);
    const readers = new Map<string, boolean>();
    for (const a of list) if (a.userId) readers.set(a.userId, (readers.get(a.userId) ?? true) && a.status === "completed");
    const today = dateInTimezone(now, group.timezone);
    return {
      groupId: group.id,
      groupName: group.name,
      groupKind: group.kind,
      timezone: group.timezone,
      khatmaId: khatma.id,
      cycleNumber: khatma.cycleNumber,
      startDate: khatma.startDate,
      dueDate: khatma.dueDate,
      juzCompleted: list.filter((a) => a.status === "completed").length,
      readers: readers.size,
      readersDone: [...readers.values()].filter(Boolean).length,
      dayOfCycle: Math.max(1, daysBetween(khatma.startDate, today) + 1),
      cycleDays: daysBetween(khatma.startDate, khatma.dueDate) + 1,
      myAssignments: list
        .filter((a) => a.userId === userId)
        .map((a) => ({ id: a.id, juzNumber: a.juzNumber, status: a.status, progress: a.progress, helpRequestedAt: a.helpRequestedAt })),
      openJuz: list
        .filter((a) => a.status !== "completed" && a.userId !== userId && (a.userId === null || a.helpRequestedAt !== null || today > khatma.dueDate))
        .map((a) => ({ id: a.id, juzNumber: a.juzNumber, help: a.userId !== null })),
    };
  });
}

/** Khatmas the user took part in that completed in the last few days (for the completion card). */
export async function recentlyCompletedKhatmas(userId: string, days = 3) {
  return db
    .select({ khatmaId: khatmas.id, groupId: groups.id, groupName: groups.name, completedAt: khatmas.completedAt, cycleNumber: khatmas.cycleNumber })
    .from(khatmas)
    .innerJoin(groups, eq(groups.id, khatmas.groupId))
    .innerJoin(groupMembers, and(eq(groupMembers.groupId, groups.id), eq(groupMembers.userId, userId), eq(groupMembers.status, "active")))
    .where(and(eq(khatmas.status, "completed"), ne(groups.status, "deleted"), sql`${khatmas.completedAt} > now() - make_interval(days => ${days})`))
    .orderBy(desc(khatmas.completedAt));
}

/** Private reflection figures — never ranked or compared with anyone. */
export async function getJourney(userId: string) {
  const [juzRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(assignments)
    .where(and(eq(assignments.completedBy, userId), eq(assignments.status, "completed")));
  const participated = await db
    .selectDistinct({ khatmaId: assignments.khatmaId, status: khatmas.status })
    .from(assignments)
    .innerJoin(khatmas, eq(khatmas.id, assignments.khatmaId))
    .where(sql`${assignments.userId} = ${userId} or ${assignments.completedBy} = ${userId} or ${assignments.originalUserId} = ${userId}`);
  const history = await db
    .select({
      id: assignments.id,
      juzNumber: assignments.juzNumber,
      completedAt: assignments.completedAt,
      groupName: groups.name,
      groupId: groups.id,
      cycleNumber: khatmas.cycleNumber,
    })
    .from(assignments)
    .innerJoin(khatmas, eq(khatmas.id, assignments.khatmaId))
    .innerJoin(groups, eq(groups.id, khatmas.groupId))
    .where(and(eq(assignments.completedBy, userId), eq(assignments.status, "completed")))
    .orderBy(desc(assignments.completedAt))
    .limit(50);
  const recentReading = await db.select().from(readingProgress).where(eq(readingProgress.userId, userId)).orderBy(desc(readingProgress.updatedAt)).limit(10);
  return {
    juzCompleted: juzRow?.n ?? 0,
    khatmasParticipated: participated.length,
    khatmasCompleted: participated.filter((p) => p.status === "completed").length,
    history,
    recentReading,
  };
}

export async function getReadingProgressForJuz(userId: string, juzNumber: number) {
  const [row] = await db.select().from(readingProgress).where(and(eq(readingProgress.userId, userId), eq(readingProgress.juzNumber, juzNumber)));
  return row ?? null;
}

/** An assignment together with its Khatma and group, only if the viewer is an active member. */
export async function getAssignmentForViewer(userId: string, assignmentId: string) {
  const [row] = await db
    .select({ assignment: assignments, khatma: khatmas, group: groups })
    .from(assignments)
    .innerJoin(khatmas, eq(khatmas.id, assignments.khatmaId))
    .innerJoin(groups, eq(groups.id, khatmas.groupId))
    .innerJoin(groupMembers, and(eq(groupMembers.groupId, groups.id), eq(groupMembers.userId, userId), eq(groupMembers.status, "active")))
    .where(and(eq(assignments.id, assignmentId), ne(groups.status, "deleted")));
  return row ?? null;
}

/** Completed Khatma details for the completion page (members only). */
export async function getKhatmaForViewer(userId: string, khatmaId: string) {
  const [row] = await db
    .select({ khatma: khatmas, group: groups, memberStatus: groupMembers.status })
    .from(khatmas)
    .innerJoin(groups, eq(groups.id, khatmas.groupId))
    .innerJoin(groupMembers, and(eq(groupMembers.groupId, groups.id), eq(groupMembers.userId, userId)))
    .where(and(eq(khatmas.id, khatmaId), ne(groups.status, "deleted")));
  if (!row || row.memberStatus === "removed") return null;
  const [counts] = await db
    .select({ readers: sql<number>`count(distinct ${assignments.completedBy})::int` })
    .from(assignments)
    .where(eq(assignments.khatmaId, khatmaId));
  const [next] = await db.select({ id: khatmas.id }).from(khatmas).where(and(eq(khatmas.groupId, row.group.id), eq(khatmas.status, "active")));
  return { ...row, readers: counts?.readers ?? 0, nextKhatmaId: next?.id ?? null };
}
