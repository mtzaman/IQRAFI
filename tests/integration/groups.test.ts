import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { assignments, groupMembers, invitations, notifications } from "@/lib/db/schema";
import { verifyDistribution } from "@/lib/khatma/engine";
import {
  acceptInvitation,
  changeMemberRole,
  createInvitation,
  deleteGroup,
  getGroupOverview,
  getInvitationPreview,
  leaveGroup,
  listUserGroups,
  removeMember,
  revokeInvitation,
  transferOwnership,
  updateGroup,
} from "@/server/services/groups";
import { startKhatma } from "@/server/services/khatmas";
import { makeGroupWithMembers, makeUser } from "./helpers";

describe("groups and assignments", () => {
  it.each([1, 2, 3, 5, 10, 15, 30, 31])("starts a Khatma with every Juz assigned exactly once for %i member(s)", async (n) => {
    const { owner, group, members } = await makeGroupWithMembers(n);
    const khatma = await startKhatma(owner.id, group.id);
    const rows = await db.select().from(assignments).where(eq(assignments.khatmaId, khatma.id));
    expect(rows).toHaveLength(30);
    expect(verifyDistribution(rows)).toEqual([]);
    const perUser = new Map<string, number>();
    for (const r of rows) perUser.set(r.userId!, (perUser.get(r.userId!) ?? 0) + 1);
    expect(perUser.size).toBe(Math.min(n, 30));
    const loads = [...perUser.values()];
    expect(Math.max(...loads) - Math.min(...loads)).toBeLessThanOrEqual(1);
    for (const id of perUser.keys()) expect(members.some((m) => m.id === id)).toBe(true);
  });

  it("leaves every Juz in the pool in manual mode", async () => {
    const { owner, group } = await makeGroupWithMembers(3, { assignmentMode: "manual" });
    const khatma = await startKhatma(owner.id, group.id);
    const rows = await db.select().from(assignments).where(eq(assignments.khatmaId, khatma.id));
    expect(rows.every((r) => r.userId === null)).toBe(true);
  });

  it("allows only one active Khatma per group and only admins to start one", async () => {
    const { owner, group, members } = await makeGroupWithMembers(2);
    await expect(startKhatma(members[1]!.id, group.id)).rejects.toMatchObject({ code: "forbidden" });
    await startKhatma(owner.id, group.id);
    await expect(startKhatma(owner.id, group.id)).rejects.toMatchObject({ code: "conflict" });
  });

  it("hides groups from non-members", async () => {
    const { group } = await makeGroupWithMembers(1);
    const stranger = await makeUser("Stranger");
    await expect(getGroupOverview(stranger.id, group.id)).rejects.toMatchObject({ code: "not_found" });
  });
});

describe("invitations", () => {
  it("accepts invitations idempotently and notifies the owner", async () => {
    const { owner, group, inviteToken } = await makeGroupWithMembers(1);
    const u = await makeUser("Sara");
    expect((await acceptInvitation(u.id, inviteToken)).joined).toBe(true);
    expect((await acceptInvitation(u.id, inviteToken)).joined).toBe(false);
    const notes = await db.select().from(notifications).where(eq(notifications.userId, owner.id));
    expect(notes.some((n) => n.type === "member_joined")).toBe(true);
    expect((await listUserGroups(u.id)).map((g) => g.id)).toContain(group.id);
  });

  it("rejects expired, exhausted and revoked invitations", async () => {
    const { owner, group } = await makeGroupWithMembers(1);
    const limited = await createInvitation(owner.id, group.id, { maxUses: 1 });
    await acceptInvitation((await makeUser()).id, limited.token);
    await expect(acceptInvitation((await makeUser()).id, limited.token)).rejects.toMatchObject({ code: "invitation_invalid" });

    const expiring = await createInvitation(owner.id, group.id, { expiresInDays: 1 });
    await db.update(invitations).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(invitations.id, expiring.id));
    expect(await getInvitationPreview(expiring.token)).toBeNull();
    await expect(acceptInvitation((await makeUser()).id, expiring.token)).rejects.toMatchObject({ code: "invitation_invalid" });

    const revoked = await createInvitation(owner.id, group.id, {});
    await revokeInvitation(owner.id, revoked.id);
    await expect(acceptInvitation((await makeUser()).id, revoked.token)).rejects.toMatchObject({ code: "invitation_invalid" });
    await expect(acceptInvitation((await makeUser()).id, "does-not-exist-token")).rejects.toMatchObject({ code: "invitation_invalid" });
  });

  it("does not let members create invitations or removed members rejoin", async () => {
    const { owner, group, members, inviteToken } = await makeGroupWithMembers(2);
    await expect(createInvitation(members[1]!.id, group.id, {})).rejects.toMatchObject({ code: "forbidden" });
    await removeMember(owner.id, group.id, members[1]!.id);
    await expect(acceptInvitation(members[1]!.id, inviteToken)).rejects.toMatchObject({ code: "invitation_invalid" });
  });
});

describe("membership changes", () => {
  it("returns a leaving member's unfinished Juz to the pool and notifies the owner", async () => {
    const { owner, group, members } = await makeGroupWithMembers(3);
    const khatma = await startKhatma(owner.id, group.id);
    const leaver = members[2]!;
    const { released } = await leaveGroup(leaver.id, group.id);
    expect(released).toHaveLength(10);
    const pool = await db.select().from(assignments).where(and(eq(assignments.khatmaId, khatma.id)));
    expect(pool.filter((a) => a.userId === null)).toHaveLength(10);
    expect(pool.filter((a) => a.userId === null).every((a) => a.originalUserId === leaver.id)).toBe(true);
    const notes = await db.select().from(notifications).where(eq(notifications.userId, owner.id));
    expect(notes.some((n) => n.type === "member_left")).toBe(true);
  });

  it("stops the owner leaving without transferring ownership", async () => {
    const { owner, group, members } = await makeGroupWithMembers(2);
    await expect(leaveGroup(owner.id, group.id)).rejects.toMatchObject({ code: "conflict" });
    await transferOwnership(owner.id, group.id, members[1]!.id);
    await leaveGroup(owner.id, group.id);
    const [m] = await db.select().from(groupMembers).where(and(eq(groupMembers.groupId, group.id), eq(groupMembers.userId, members[1]!.id)));
    expect(m?.role).toBe("owner");
  });

  it("enforces role permissions for member management", async () => {
    const { owner, group, members } = await makeGroupWithMembers(4);
    const [, admin, memberA, memberB] = members;
    await expect(changeMemberRole(admin!.id, group.id, memberA!.id, "admin")).rejects.toMatchObject({ code: "forbidden" });
    await changeMemberRole(owner.id, group.id, admin!.id, "admin");
    await expect(removeMember(memberA!.id, group.id, memberB!.id)).rejects.toMatchObject({ code: "forbidden" });
    await expect(removeMember(admin!.id, group.id, owner.id)).rejects.toMatchObject({ code: "forbidden" });
    await removeMember(admin!.id, group.id, memberB!.id);
    await expect(updateGroup(admin!.id, group.id, { schedule: "daily" })).rejects.toMatchObject({ code: "forbidden" });
    await updateGroup(admin!.id, group.id, { name: "Renamed" });
    await expect(deleteGroup(admin!.id, group.id)).rejects.toMatchObject({ code: "forbidden" });
    await deleteGroup(owner.id, group.id);
    expect(await listUserGroups(owner.id)).toHaveLength(0);
  });
});
