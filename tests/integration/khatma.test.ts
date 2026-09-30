import { and, asc, eq, isNull } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { assignmentEvents, assignments, groups, khatmas, notifications } from "@/lib/db/schema";
import { claimAssignment, completeAssignment, reassignAssignment, recordReadingPosition, releaseAssignment, requestHelp } from "@/server/services/assignments";
import { deleteAccount } from "@/server/services/users";
import { rebalanceKhatma, startKhatma } from "@/server/services/khatmas";
import { getGlobalStats, refreshGlobalStats } from "@/server/services/stats";
import { acceptInvitation } from "@/server/services/groups";
import { makeGroupWithMembers, makeUser } from "./helpers";

async function assignmentsOf(khatmaId: string) {
  return db.select().from(assignments).where(eq(assignments.khatmaId, khatmaId)).orderBy(asc(assignments.juzNumber));
}

async function completeAll(khatmaId: string, except: number[] = []) {
  for (const a of await assignmentsOf(khatmaId)) {
    if (!except.includes(a.juzNumber)) await completeAssignment(a.userId!, a.id);
  }
}

describe("progress tracking", () => {
  it("tracks reading progress but never completes a Juz without a deliberate action", async () => {
    const { owner, group } = await makeGroupWithMembers(1);
    const khatma = await startKhatma(owner.id, group.id);
    const [juz1] = await assignmentsOf(khatma.id);
    // Juz 1 spans ayah ids 1..148; read to the last ayah.
    await recordReadingPosition(owner.id, 74);
    let [a] = await db.select().from(assignments).where(eq(assignments.id, juz1!.id));
    expect(a?.status).toBe("in_progress");
    expect(a?.progress).toBe(50);
    await recordReadingPosition(owner.id, 148);
    [a] = await db.select().from(assignments).where(eq(assignments.id, juz1!.id));
    expect(a?.progress).toBe(99);
    expect(a?.status).toBe("in_progress");
    // Going back does not reduce progress.
    await recordReadingPosition(owner.id, 10);
    [a] = await db.select().from(assignments).where(eq(assignments.id, juz1!.id));
    expect(a?.progress).toBe(99);
  });
});

describe("completion", () => {
  it("completes idempotently and only for the assigned reader", async () => {
    const { owner, group, members } = await makeGroupWithMembers(2);
    const khatma = await startKhatma(owner.id, group.id);
    const mine = (await assignmentsOf(khatma.id)).find((a) => a.userId === owner.id)!;
    await expect(completeAssignment(members[1]!.id, mine.id)).rejects.toMatchObject({ code: "forbidden" });
    const first = await completeAssignment(owner.id, mine.id);
    const retry = await completeAssignment(owner.id, mine.id);
    expect(first.alreadyCompleted).toBe(false);
    expect(retry.alreadyCompleted).toBe(true);
    await refreshGlobalStats();
    expect((await getGlobalStats()).juzCompleted).toBe(1);
  });

  it("detects Khatma completion, updates statistics and starts a rotated next cycle", async () => {
    const { owner, group, members } = await makeGroupWithMembers(3);
    const khatma = await startKhatma(owner.id, group.id);
    const before = await assignmentsOf(khatma.id);
    await completeAll(khatma.id);
    const [done] = await db.select().from(khatmas).where(eq(khatmas.id, khatma.id));
    expect(done?.status).toBe("completed");
    expect(done?.completedAt).not.toBeNull();

    const [next] = await db.select().from(khatmas).where(and(eq(khatmas.groupId, group.id), eq(khatmas.status, "active")));
    expect(next?.cycleNumber).toBe(2);
    const after = await assignmentsOf(next!.id);
    expect(after).toHaveLength(30);
    const firstJuz = (rows: typeof before, userId: string) => rows.find((a) => a.userId === userId)!.juzNumber;
    expect(firstJuz(before, owner.id)).toBe(1);
    expect(firstJuz(after, owner.id)).toBe(11);

    for (const m of members) {
      const notes = await db.select().from(notifications).where(and(eq(notifications.userId, m.id), eq(notifications.type, "khatma_completed")));
      expect(notes).toHaveLength(1);
    }
    const stats = await getGlobalStats();
    expect(stats.juzCompleted).toBe(30);
    expect(stats.quransCompleted).toBe(1);
    expect(stats.juzCompletedToday).toBe(30);
    await refreshGlobalStats();
    const reconciled = await getGlobalStats();
    expect(reconciled.juzCompleted).toBe(30);
    expect(reconciled.quransCompleted).toBe(1);
    expect(reconciled.readers).toBe(3);
    expect(reconciled.activeKhatmas).toBe(1);
  });

  it("does not start another cycle for non-recurring groups", async () => {
    const { owner, group } = await makeGroupWithMembers(1, { recurring: false });
    const khatma = await startKhatma(owner.id, group.id);
    await completeAll(khatma.id);
    const active = await db.select().from(khatmas).where(and(eq(khatmas.groupId, group.id), eq(khatmas.status, "active")));
    expect(active).toHaveLength(0);
  });

  it("finalises exactly once when the last Juz are completed concurrently", async () => {
    const { owner, group } = await makeGroupWithMembers(30, { recurring: false });
    const khatma = await startKhatma(owner.id, group.id);
    await completeAll(khatma.id, [28, 29, 30]);
    const last = (await assignmentsOf(khatma.id)).filter((a) => a.status !== "completed");
    const results = await Promise.all(last.map((a) => completeAssignment(a.userId!, a.id)));
    expect(results.filter((r) => r.khatmaCompleted)).toHaveLength(1);
    await refreshGlobalStats();
    const stats = await getGlobalStats();
    expect(stats.quransCompleted).toBe(1);
    expect(stats.juzCompleted).toBe(30);
    void owner;
  });
});

describe("incomplete Juz: help, release, volunteer takeover", () => {
  it("lets a member volunteer only once help is requested, recording the takeover", async () => {
    const { owner, group, members } = await makeGroupWithMembers(2);
    const khatma = await startKhatma(owner.id, group.id);
    const helper = members[1]!;
    const target = (await assignmentsOf(khatma.id)).find((a) => a.userId === owner.id)!;
    await expect(claimAssignment(helper.id, target.id)).rejects.toMatchObject({ code: "already_claimed" });
    await requestHelp(owner.id, target.id);
    const helpNote = await db.select().from(notifications).where(and(eq(notifications.userId, helper.id), eq(notifications.type, "help_requested")));
    expect(helpNote).toHaveLength(1);
    const claimed = await claimAssignment(helper.id, target.id);
    expect(claimed.userId).toBe(helper.id);
    expect(claimed.originalUserId).toBe(owner.id);
    const [event] = await db.select().from(assignmentEvents).where(and(eq(assignmentEvents.assignmentId, target.id), eq(assignmentEvents.type, "volunteered")));
    expect(event).toMatchObject({ fromUserId: owner.id, toUserId: helper.id });
    const result = await completeAssignment(helper.id, target.id);
    expect(result.alreadyCompleted).toBe(false);
    const [row] = await db.select().from(assignments).where(eq(assignments.id, target.id));
    expect(row).toMatchObject({ completedBy: helper.id, originalUserId: owner.id, status: "completed" });
  });

  it("allows claiming overdue Juz", async () => {
    const { owner, group, members } = await makeGroupWithMembers(2, { schedule: "daily" });
    const khatma = await startKhatma(owner.id, group.id);
    const target = (await assignmentsOf(khatma.id)).find((a) => a.userId === owner.id)!;
    const later = new Date(Date.now() + 3 * 86_400_000);
    const claimed = await claimAssignment(members[1]!.id, target.id, later);
    expect(claimed.userId).toBe(members[1]!.id);
  });

  it("gives a released Juz to exactly one of several simultaneous volunteers", async () => {
    const { owner, group, members } = await makeGroupWithMembers(5);
    const khatma = await startKhatma(owner.id, group.id);
    const target = (await assignmentsOf(khatma.id)).find((a) => a.userId === owner.id)!;
    await releaseAssignment(owner.id, target.id);
    const attempts = await Promise.allSettled(members.slice(1).map((m) => claimAssignment(m.id, target.id)));
    // The first claim wins; later claims see the Juz is no longer in the pool.
    expect(attempts.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(attempts.filter((r) => r.status === "rejected").every((r) => (r as PromiseRejectedResult).reason.code === "already_claimed")).toBe(true);
  });

  it("lets new members claim available Juz and admins reassign or rebalance", async () => {
    const { owner, group, members, inviteToken } = await makeGroupWithMembers(2);
    const khatma = await startKhatma(owner.id, group.id);
    const newcomer = await makeUser("Yusuf");
    await acceptInvitation(newcomer.id, inviteToken);
    const target = (await assignmentsOf(khatma.id)).find((a) => a.userId === members[1]!.id)!;
    await expect(reassignAssignment(members[1]!.id, target.id, newcomer.id)).rejects.toMatchObject({ code: "forbidden" });
    const moved = await reassignAssignment(owner.id, target.id, newcomer.id);
    expect(moved.userId).toBe(newcomer.id);

    const result = await rebalanceKhatma(owner.id, khatma.id);
    expect(result.considered).toBe(30);
    const rows = await assignmentsOf(khatma.id);
    const counts = [owner.id, members[1]!.id, newcomer.id].map((id) => rows.filter((r) => r.userId === id).length);
    expect(counts.sort()).toEqual([10, 10, 10]);
  });

  it("returns a deleted account's unfinished Juz to the pool and hands over ownership", async () => {
    const { owner, group, members } = await makeGroupWithMembers(2);
    const khatma = await startKhatma(owner.id, group.id);
    await deleteAccount(owner.id);
    const pool = await db.select().from(assignments).where(and(eq(assignments.khatmaId, khatma.id), isNull(assignments.userId)));
    expect(pool).toHaveLength(15);
    const [g] = await db.select().from(groups).where(eq(groups.id, group.id));
    expect(g?.ownerId).toBe(members[1]!.id);
  });
});
