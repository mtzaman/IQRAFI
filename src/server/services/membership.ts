import { and, eq, inArray } from "drizzle-orm";
import type { DbOrTx } from "@/lib/db";
import { groupMembers, groups, type GroupRole } from "@/lib/db/schema";
import { can, type GroupAction } from "@/lib/permissions";
import { AppError } from "../errors";

export type Group = typeof groups.$inferSelect;
export type Membership = typeof groupMembers.$inferSelect;

/** Loads a live group and the actor's active membership, enforcing a permission. */
export async function requireGroupPermission(
  tx: DbOrTx,
  groupId: string,
  userId: string,
  action: GroupAction,
  opts: { lock?: boolean } = {},
): Promise<{ group: Group; membership: Membership }> {
  const groupQuery = tx.select().from(groups).where(eq(groups.id, groupId));
  const [group] = opts.lock ? await groupQuery.for("update") : await groupQuery;
  if (!group || group.status === "deleted") throw new AppError("not_found");
  const [membership] = await tx
    .select()
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId), eq(groupMembers.status, "active")));
  if (!membership) throw new AppError("not_found");
  if (!can(membership.role, action)) throw new AppError("forbidden");
  return { group, membership };
}

export async function activeMembers(tx: DbOrTx, groupId: string) {
  return tx
    .select()
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.status, "active")))
    .orderBy(groupMembers.joinedAt, groupMembers.id);
}

export async function memberIdsWithRoles(tx: DbOrTx, groupId: string, roles: readonly GroupRole[]) {
  const rows = await tx
    .select({ userId: groupMembers.userId })
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.status, "active"), inArray(groupMembers.role, [...roles])));
  return rows.map((r) => r.userId);
}
