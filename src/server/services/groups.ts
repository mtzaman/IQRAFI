/**
 * Groups, membership and invitations.
 */
import { randomBytes } from "node:crypto";
import { and, asc, desc, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { assignments, groupMembers, groups, invitations, khatmas, users, type GroupRole } from "@/lib/db/schema";
import { cycleDaysFor } from "@/lib/khatma/schedule";
import { canManageMember } from "@/lib/permissions";
import { createGroupSchema, invitationSchema, updateGroupSchema, type CreateGroupInput, type UpdateGroupInput } from "@/lib/validation";
import { AppError } from "../errors";
import { releaseUnfinishedForUser } from "./khatmas";
import { memberIdsWithRoles, requireGroupPermission } from "./membership";
import { notify } from "./notifications";

export function generateInviteToken() {
  return randomBytes(18).toString("base64url");
}

export async function createGroup(ownerId: string, input: CreateGroupInput) {
  const v = createGroupSchema.parse(input);
  const isRamadan = v.kind === "ramadan";
  const schedule = isRamadan ? "custom" : v.schedule;
  const cycleDays = isRamadan ? 30 : cycleDaysFor(v.schedule, v.customDays);
  return db.transaction(async (tx) => {
    const [group] = await tx
      .insert(groups)
      .values({
        name: v.name,
        description: v.description,
        ownerId,
        timezone: v.timezone,
        schedule,
        cycleDays,
        startDate: v.startDate ?? null,
        assignmentMode: v.assignmentMode,
        recurring: isRamadan ? false : v.recurring,
        rotate: v.rotate,
        kind: v.kind,
      })
      .returning();
    await tx.insert(groupMembers).values({ groupId: group!.id, userId: ownerId, role: "owner" });
    await tx.insert(invitations).values({ groupId: group!.id, createdBy: ownerId, token: generateInviteToken() });
    return group!;
  });
}

export async function updateGroup(actorId: string, groupId: string, input: UpdateGroupInput) {
  const v = updateGroupSchema.parse(input);
  return db.transaction(async (tx) => {
    const touchesSchedule = v.schedule !== undefined || v.timezone !== undefined;
    const { group } = await requireGroupPermission(tx, groupId, actorId, touchesSchedule ? "group.update_schedule" : "group.update_settings", { lock: true });
    const patch: Partial<typeof groups.$inferInsert> = {};
    if (v.name !== undefined) patch.name = v.name;
    if (input.description !== undefined) patch.description = v.description;
    if (v.assignmentMode !== undefined) patch.assignmentMode = v.assignmentMode;
    if (v.recurring !== undefined) patch.recurring = v.recurring;
    if (v.rotate !== undefined) patch.rotate = v.rotate;
    if (v.timezone !== undefined) patch.timezone = v.timezone;
    if (v.schedule !== undefined) {
      // Applies to the next cycle; the running Khatma keeps its dates.
      patch.schedule = v.schedule;
      patch.cycleDays = cycleDaysFor(v.schedule, v.customDays ?? group.cycleDays);
    }
    const [updated] = await tx.update(groups).set(patch).where(eq(groups.id, groupId)).returning();
    return updated!;
  });
}

/** Soft delete: the group disappears for everyone, aggregate history is preserved. */
export async function deleteGroup(actorId: string, groupId: string) {
  await db.transaction(async (tx) => {
    await requireGroupPermission(tx, groupId, actorId, "group.delete", { lock: true });
    await tx.update(groups).set({ status: "deleted", deletedAt: new Date() }).where(eq(groups.id, groupId));
    await tx.update(khatmas).set({ status: "cancelled" }).where(and(eq(khatmas.groupId, groupId), eq(khatmas.status, "active")));
    await tx.update(invitations).set({ revokedAt: new Date() }).where(and(eq(invitations.groupId, groupId), isNull(invitations.revokedAt)));
  });
}

async function departMember(actorId: string, groupId: string, userId: string, status: "left" | "removed") {
  return db.transaction(async (tx) => {
    const [group] = await tx.select().from(groups).where(eq(groups.id, groupId)).for("update");
    if (!group || group.status === "deleted") throw new AppError("not_found");
    const [member] = await tx
      .select()
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId), eq(groupMembers.status, "active")));
    if (!member) throw new AppError("not_found");
    if (member.role === "owner") throw new AppError("conflict", "The owner must transfer ownership before leaving");

    await tx.update(groupMembers).set({ status, leftAt: new Date(), role: "member" }).where(eq(groupMembers.id, member.id));
    const released = await releaseUnfinishedForUser(tx, group, userId, actorId);

    const admins = (await memberIdsWithRoles(tx, groupId, ["owner", "admin"])).filter((id) => id !== actorId);
    await notify(tx, admins, "member_left", { groupId, groupName: group.name, released: released.join(", ") || null });
    if (released.length) {
      const everyone = (await memberIdsWithRoles(tx, groupId, ["owner", "admin", "member"])).filter((id) => !admins.includes(id));
      await notify(tx, everyone, "juz_available", { groupId, groupName: group.name, juz: released[0]!, count: released.length });
    }
    return { released };
  });
}

export async function leaveGroup(userId: string, groupId: string) {
  return departMember(userId, groupId, userId, "left");
}

export async function removeMember(actorId: string, groupId: string, targetUserId: string) {
  const { membership } = await requireGroupPermission(db, groupId, actorId, "members.manage");
  const [target] = await db
    .select()
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, targetUserId), eq(groupMembers.status, "active")));
  if (!target) throw new AppError("not_found");
  if (actorId === targetUserId || !canManageMember(membership.role, target.role)) throw new AppError("forbidden");
  return departMember(actorId, groupId, targetUserId, "removed");
}

export async function changeMemberRole(actorId: string, groupId: string, targetUserId: string, role: Exclude<GroupRole, "owner">) {
  return db.transaction(async (tx) => {
    await requireGroupPermission(tx, groupId, actorId, "admins.manage", { lock: true });
    const [target] = await tx
      .select()
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, targetUserId), eq(groupMembers.status, "active")));
    if (!target || target.role === "owner") throw new AppError("forbidden");
    await tx.update(groupMembers).set({ role }).where(eq(groupMembers.id, target.id));
  });
}

export async function transferOwnership(actorId: string, groupId: string, targetUserId: string) {
  return db.transaction(async (tx) => {
    await requireGroupPermission(tx, groupId, actorId, "admins.manage", { lock: true });
    const [target] = await tx
      .select()
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, targetUserId), eq(groupMembers.status, "active")));
    if (!target || targetUserId === actorId) throw new AppError("validation");
    await tx.update(groupMembers).set({ role: "admin" }).where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, actorId)));
    await tx.update(groupMembers).set({ role: "owner" }).where(eq(groupMembers.id, target.id));
    await tx.update(groups).set({ ownerId: targetUserId }).where(eq(groups.id, groupId));
  });
}

/* ------------------------------ Invitations ------------------------------ */

export async function createInvitation(actorId: string, groupId: string, input: { expiresInDays?: number | null; maxUses?: number | null }) {
  const v = invitationSchema.parse(input);
  await requireGroupPermission(db, groupId, actorId, "invitations.manage");
  const [inv] = await db
    .insert(invitations)
    .values({
      groupId,
      createdBy: actorId,
      token: generateInviteToken(),
      expiresAt: v.expiresInDays ? new Date(Date.now() + v.expiresInDays * 86_400_000) : null,
      maxUses: v.maxUses ?? null,
    })
    .returning();
  return inv!;
}

export async function revokeInvitation(actorId: string, invitationId: string) {
  const [inv] = await db.select().from(invitations).where(eq(invitations.id, invitationId));
  if (!inv) throw new AppError("not_found");
  await requireGroupPermission(db, inv.groupId, actorId, "invitations.manage");
  await db.update(invitations).set({ revokedAt: new Date() }).where(eq(invitations.id, invitationId));
}

export function invitationUsable(inv: typeof invitations.$inferSelect, now = new Date()) {
  if (inv.revokedAt) return false;
  if (inv.expiresAt && inv.expiresAt <= now) return false;
  if (inv.maxUses != null && inv.uses >= inv.maxUses) return false;
  return true;
}

/** Public preview for the invitation landing page. Reveals only what an invitee needs. */
export async function getInvitationPreview(token: string) {
  if (!/^[A-Za-z0-9_-]{10,64}$/.test(token)) return null;
  const [row] = await db
    .select({ inv: invitations, group: groups })
    .from(invitations)
    .innerJoin(groups, eq(groups.id, invitations.groupId))
    .where(eq(invitations.token, token));
  if (!row || row.group.status !== "active" || !invitationUsable(row.inv)) return null;
  const [count] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, row.group.id), eq(groupMembers.status, "active")));
  return {
    groupId: row.group.id,
    name: row.group.name,
    description: row.group.description,
    schedule: row.group.schedule,
    cycleDays: row.group.cycleDays,
    kind: row.group.kind,
    memberCount: count?.n ?? 0,
  };
}

/** Joins a group through an invitation. Idempotent for existing members. */
export async function acceptInvitation(userId: string, token: string) {
  return db.transaction(async (tx) => {
    const [inv] = await tx.select().from(invitations).where(eq(invitations.token, token)).for("update");
    if (!inv) throw new AppError("invitation_invalid");
    const [group] = await tx.select().from(groups).where(eq(groups.id, inv.groupId));
    if (!group || group.status !== "active") throw new AppError("invitation_invalid");

    const [existing] = await tx
      .select()
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, group.id), eq(groupMembers.userId, userId)));
    if (existing?.status === "active") return { group, joined: false };
    if (existing?.status === "removed") throw new AppError("invitation_invalid");
    if (!invitationUsable(inv)) throw new AppError("invitation_invalid");

    if (existing) {
      await tx.update(groupMembers).set({ status: "active", role: "member", joinedAt: new Date(), leftAt: null }).where(eq(groupMembers.id, existing.id));
    } else {
      await tx.insert(groupMembers).values({ groupId: group.id, userId, role: "member" });
    }
    await tx.update(invitations).set({ uses: sql`${invitations.uses} + 1` }).where(eq(invitations.id, inv.id));
    const [joiner] = await tx.select({ name: users.name }).from(users).where(eq(users.id, userId));
    const admins = await memberIdsWithRoles(tx, group.id, ["owner", "admin"]);
    await notify(tx, admins, "member_joined", { groupId: group.id, groupName: group.name, name: joiner?.name ?? null });
    return { group, joined: true };
  });
}

/* -------------------------------- Queries -------------------------------- */

export async function listUserGroups(userId: string) {
  const rows = await db
    .select({ group: groups, role: groupMembers.role })
    .from(groupMembers)
    .innerJoin(groups, eq(groups.id, groupMembers.groupId))
    .where(and(eq(groupMembers.userId, userId), eq(groupMembers.status, "active"), ne(groups.status, "deleted")))
    .orderBy(desc(groups.createdAt));
  const groupIds = rows.map((r) => r.group.id);
  const active = groupIds.length
    ? await db
        .select({
          groupId: khatmas.groupId,
          khatmaId: khatmas.id,
          cycleNumber: khatmas.cycleNumber,
          dueDate: khatmas.dueDate,
          completed: sql<number>`count(*) filter (where ${assignments.status} = 'completed')::int`,
        })
        .from(khatmas)
        .innerJoin(assignments, eq(assignments.khatmaId, khatmas.id))
        .where(and(inArray(khatmas.groupId, groupIds), eq(khatmas.status, "active")))
        .groupBy(khatmas.id)
    : [];
  const counts = groupIds.length
    ? await db
        .select({ groupId: groupMembers.groupId, n: sql<number>`count(*)::int` })
        .from(groupMembers)
        .where(and(inArray(groupMembers.groupId, groupIds), eq(groupMembers.status, "active")))
        .groupBy(groupMembers.groupId)
    : [];
  return rows.map((r) => ({
    ...r.group,
    role: r.role,
    memberCount: counts.find((c) => c.groupId === r.group.id)?.n ?? 0,
    activeKhatma: active.find((a) => a.groupId === r.group.id) ?? null,
  }));
}

/** Everything the group page needs, for a verified member. */
export async function getGroupOverview(userId: string, groupId: string) {
  const { group, membership } = await requireGroupPermission(db, groupId, userId, "group.read");
  const members = await db
    .select({ userId: groupMembers.userId, role: groupMembers.role, joinedAt: groupMembers.joinedAt, name: users.name, avatarUrl: users.avatarUrl })
    .from(groupMembers)
    .innerJoin(users, eq(users.id, groupMembers.userId))
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.status, "active")))
    .orderBy(asc(groupMembers.joinedAt));
  const allKhatmas = await db.select().from(khatmas).where(eq(khatmas.groupId, groupId)).orderBy(desc(khatmas.cycleNumber));
  const current = allKhatmas.find((k) => k.status === "active") ?? null;
  const currentAssignments = current
    ? await db.select().from(assignments).where(eq(assignments.khatmaId, current.id)).orderBy(asc(assignments.juzNumber))
    : [];
  const activeInvites =
    membership.role === "member"
      ? []
      : (await db.select().from(invitations).where(and(eq(invitations.groupId, groupId), isNull(invitations.revokedAt))).orderBy(desc(invitations.createdAt))).filter((i) =>
          invitationUsable(i),
        );
  const [shareInvite] = activeInvites.length
    ? activeInvites
    : await db
        .select()
        .from(invitations)
        .where(and(eq(invitations.groupId, groupId), isNull(invitations.revokedAt), isNull(invitations.expiresAt), isNull(invitations.maxUses)))
        .limit(1);
  return { group, membership, members, khatmas: allKhatmas, current, assignments: currentAssignments, invitations: activeInvites, shareInvite: shareInvite ?? null };
}
