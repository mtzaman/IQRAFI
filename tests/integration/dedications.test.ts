import { describe, expect, it } from "vitest";
import { deleteDedication, listPublicDedications, listUserDedications, listVisibleDedications, saveDedication } from "@/server/services/dedications";
import { startKhatma } from "@/server/services/khatmas";
import { blockUser, createReport, resolveReport } from "@/server/services/moderation";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { completeAssignment } from "@/server/services/assignments";
import { assignments } from "@/lib/db/schema";
import { makeGroupWithMembers, makeUser } from "./helpers";

async function completedKhatma() {
  const ctx = await makeGroupWithMembers(2, { recurring: false });
  const khatma = await startKhatma(ctx.owner.id, ctx.group.id);
  for (const a of await db.select().from(assignments).where(eq(assignments.khatmaId, khatma.id))) await completeAssignment(a.userId!, a.id);
  return { ...ctx, khatma };
}

describe("dedications", () => {
  it("is private by default and visible only to its author", async () => {
    const { owner, members, khatma } = await completedKhatma();
    const d = await saveDedication(owner.id, khatma.id, { type: "in_memory", name: "Ahmed Khan" });
    expect(d.visibility).toBe("private");
    expect((await listVisibleDedications(owner.id, khatma.id)).map((x) => x.id)).toEqual([d.id]);
    expect(await listVisibleDedications(members[1]!.id, khatma.id)).toHaveLength(0);
    expect((await listUserDedications(owner.id))[0]?.dedication.name).toBe("Ahmed Khan");
  });

  it("shares group dedications with members only", async () => {
    const { owner, members, khatma } = await completedKhatma();
    await saveDedication(owner.id, khatma.id, { type: "parents", visibility: "group" });
    expect(await listVisibleDedications(members[1]!.id, khatma.id)).toHaveLength(1);
    const stranger = await makeUser();
    await expect(listVisibleDedications(stranger.id, khatma.id)).rejects.toMatchObject({ code: "not_found" });
    await expect(saveDedication(stranger.id, khatma.id, { type: "myself" })).rejects.toMatchObject({ code: "not_found" });
  });

  it("requires explicit confirmation before a dedication becomes public", async () => {
    const { owner, khatma } = await completedKhatma();
    await expect(saveDedication(owner.id, khatma.id, { type: "community", visibility: "public" })).rejects.toThrow();
    const d = await saveDedication(owner.id, khatma.id, { type: "community", visibility: "public", confirmPublic: true });
    expect(d.publicConfirmedAt).not.toBeNull();
    const pub = await listPublicDedications(null);
    expect(pub).toHaveLength(1);
    expect(pub[0]).not.toHaveProperty("userId");
    // Editing back to private removes it from public listings.
    await saveDedication(owner.id, khatma.id, { type: "community", visibility: "private" });
    expect(await listPublicDedications(null)).toHaveLength(0);
    await deleteDedication(owner.id, d.id);
    expect(await listUserDedications(owner.id)).toHaveLength(0);
  });

  it("lets moderators hide reported public dedications and users block authors", async () => {
    const { owner, members, khatma } = await completedKhatma();
    const d = await saveDedication(owner.id, khatma.id, { type: "other", message: "Shared", visibility: "public", confirmPublic: true });
    const viewer = members[1]!;
    await blockUser(viewer.id, owner.id);
    expect(await listPublicDedications(viewer.id)).toHaveLength(0);
    expect(await listPublicDedications(null)).toHaveLength(1);

    const report = await createReport(viewer.id, { targetType: "dedication", targetId: d.id, reason: "inappropriate" });
    await expect(resolveReport(viewer.id, report.id, "hide_dedication")).rejects.toMatchObject({ code: "forbidden" });
    const admin = await makeUser("Admin");
    await db.update(users).set({ platformRole: "admin" }).where(eq(users.id, admin.id));
    await resolveReport(admin.id, report.id, "hide_dedication");
    expect(await listPublicDedications(null)).toHaveLength(0);
  });
});
