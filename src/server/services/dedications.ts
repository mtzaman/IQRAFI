/**
 * Khatma dedications (intentions). Private by default; group visibility shares with the
 * group's members; public requires explicit confirmation (also enforced by a DB constraint).
 */
import { and, desc, eq, isNull, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { dedications, groupMembers, groups, khatmas, userBlocks, users } from "@/lib/db/schema";
import { dedicationSchema, type DedicationInput } from "@/lib/validation";
import { AppError } from "../errors";

async function requireKhatmaParticipant(userId: string, khatmaId: string) {
  const [row] = await db
    .select({ khatma: khatmas, group: groups, memberStatus: groupMembers.status })
    .from(khatmas)
    .innerJoin(groups, eq(groups.id, khatmas.groupId))
    .innerJoin(groupMembers, and(eq(groupMembers.groupId, groups.id), eq(groupMembers.userId, userId)))
    .where(eq(khatmas.id, khatmaId));
  if (!row || row.group.status === "deleted" || row.memberStatus === "removed") throw new AppError("not_found");
  return row;
}

export async function saveDedication(userId: string, khatmaId: string, input: DedicationInput) {
  const v = dedicationSchema.parse(input);
  await requireKhatmaParticipant(userId, khatmaId);
  const values = {
    type: v.type,
    name: v.name,
    message: v.message,
    visibility: v.visibility,
    publicConfirmedAt: v.visibility === "public" ? new Date() : null,
  };
  const [row] = await db
    .insert(dedications)
    .values({ userId, khatmaId, ...values })
    .onConflictDoUpdate({ target: [dedications.userId, dedications.khatmaId], set: values })
    .returning();
  return row!;
}

export async function deleteDedication(userId: string, dedicationId: string) {
  const rows = await db.delete(dedications).where(and(eq(dedications.id, dedicationId), eq(dedications.userId, userId))).returning();
  if (!rows.length) throw new AppError("not_found");
}

export async function getOwnDedication(userId: string, khatmaId: string) {
  const [row] = await db.select().from(dedications).where(and(eq(dedications.userId, userId), eq(dedications.khatmaId, khatmaId)));
  return row ?? null;
}

/** Dedications the viewer may see for a Khatma: their own, group-visible (if a member), and public. */
export async function listVisibleDedications(viewerId: string, khatmaId: string) {
  const { memberStatus } = await requireKhatmaParticipant(viewerId, khatmaId);
  const isMember = memberStatus === "active";
  const rows = await db
    .select({ dedication: dedications, authorName: users.name })
    .from(dedications)
    .innerJoin(users, eq(users.id, dedications.userId))
    .leftJoin(userBlocks, and(eq(userBlocks.blockerId, viewerId), eq(userBlocks.blockedId, dedications.userId)))
    .where(
      and(
        eq(dedications.khatmaId, khatmaId),
        isNull(userBlocks.blockerId),
        or(
          eq(dedications.userId, viewerId),
          and(isNull(dedications.hiddenByModeratorAt), isMember ? or(eq(dedications.visibility, "group"), eq(dedications.visibility, "public")) : eq(dedications.visibility, "public")),
        ),
      ),
    )
    .orderBy(desc(dedications.createdAt));
  return rows.map((r) => ({ ...r.dedication, authorName: r.authorName, isOwn: r.dedication.userId === viewerId }));
}

/** The user's private dedication history across all their Khatmas. */
export async function listUserDedications(userId: string) {
  return db
    .select({
      dedication: dedications,
      groupName: groups.name,
      cycleNumber: khatmas.cycleNumber,
      khatmaStatus: khatmas.status,
      completedAt: khatmas.completedAt,
    })
    .from(dedications)
    .innerJoin(khatmas, eq(khatmas.id, dedications.khatmaId))
    .innerJoin(groups, eq(groups.id, khatmas.groupId))
    .where(eq(dedications.userId, userId))
    .orderBy(desc(dedications.createdAt));
}

/** Public dedications that authors explicitly chose to share (Discover page). */
export async function listPublicDedications(viewerId: string | null, limit = 12) {
  const rows = await db
    .select({ dedication: dedications, completedAt: khatmas.completedAt })
    .from(dedications)
    .innerJoin(khatmas, eq(khatmas.id, dedications.khatmaId))
    .innerJoin(groups, eq(groups.id, khatmas.groupId))
    .leftJoin(userBlocks, viewerId ? and(eq(userBlocks.blockerId, viewerId), eq(userBlocks.blockedId, dedications.userId)) : sql`false`)
    .where(and(eq(dedications.visibility, "public"), isNull(dedications.hiddenByModeratorAt), eq(khatmas.status, "completed"), eq(groups.status, "active"), isNull(userBlocks.blockerId)))
    .orderBy(desc(khatmas.completedAt))
    .limit(limit);
  // Public dedications never reveal who wrote them.
  return rows.map((r) => ({ id: r.dedication.id, type: r.dedication.type, name: r.dedication.name, message: r.dedication.message, completedAt: r.completedAt }));
}
