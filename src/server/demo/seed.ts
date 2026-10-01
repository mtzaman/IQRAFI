/**
 * Development/demo data — clearly labelled (is_demo = true, @demo.iqrafi.com emails).
 * Built through the real services so every figure, including global statistics, comes from
 * genuine database activity.
 */
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { assignments, groups, khatmas, users } from "@/lib/db/schema";
import { hashPassword } from "../auth/password";
import { getJuzMeta } from "../quran/reader";
import { completeAssignment, recordReadingPosition } from "../services/assignments";
import { saveDedication } from "../services/dedications";
import { acceptInvitation, createGroup, getGroupOverview } from "../services/groups";
import { startKhatma } from "../services/khatmas";
import { refreshGlobalStats } from "../services/stats";

export const DEMO_PASSWORD = "demo-password-123";
export const DEMO_PEOPLE = ["Ahmed", "Sara", "Ali", "Fatima", "Yusuf"];
export const demoEmail = (name: string) => `${name.toLowerCase()}@demo.iqrafi.com`;

/** Seeds the demo group once. Returns false if demo data already exists. */
export async function seedDemo(): Promise<boolean> {
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.isDemo, true)).limit(1);
  if (existing.length) return false;

  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const people = await db
    .insert(users)
    .values(
      DEMO_PEOPLE.map((name, i) => ({
        name,
        email: demoEmail(name),
        passwordHash,
        isDemo: true,
        timezone: ["Europe/London", "Asia/Karachi", "America/New_York", "Asia/Dubai", "Asia/Jakarta"][i]!,
        platformRole: i === 0 ? ("admin" as const) : ("user" as const),
        onboardedAt: new Date(),
      })),
    )
    .returning();
  const ahmed = people[0]!;

  const group = await createGroup(ahmed.id, {
    name: "Family Khatma",
    description: "Demo group — our family completing the Qur'an together every week.",
    schedule: "weekly",
    timezone: "Europe/London",
    assignmentMode: "automatic",
    recurring: true,
    rotate: true,
    kind: "standard",
  });
  await db.update(groups).set({ isDemo: true }).where(eq(groups.id, group.id));
  const token = (await getGroupOverview(ahmed.id, group.id)).shareInvite!.token;
  for (const p of people.slice(1)) await acceptInvitation(p.id, token);

  // Cycle 1: fully completed (the next cycle starts automatically), with dedications.
  const first = await startKhatma(ahmed.id, group.id);
  for (const a of await db.select().from(assignments).where(eq(assignments.khatmaId, first.id)).orderBy(asc(assignments.juzNumber))) {
    await completeAssignment(a.userId!, a.id);
  }
  await saveDedication(ahmed.id, first.id, { type: "in_memory", name: "Ahmed Khan", visibility: "private" });
  await saveDedication(people[1]!.id, first.id, { type: "parents", visibility: "group", message: "For our parents, with love." });

  // Cycle 2: realistic partial progress — 17 of 30 Juz complete, some in progress.
  const [second] = await db.select().from(khatmas).where(and(eq(khatmas.groupId, group.id), eq(khatmas.status, "active")));
  const rows = await db.select().from(assignments).where(eq(assignments.khatmaId, second!.id)).orderBy(asc(assignments.juzNumber));
  const byUser = new Map<string, typeof rows>();
  for (const r of rows) byUser.set(r.userId!, [...(byUser.get(r.userId!) ?? []), r]);
  const plan = [6, 5, 3, 2, 1]; // completed Juz per person (sums to 17)
  let i = 0;
  for (const [userId, list] of byUser) {
    const done = plan[i++] ?? 0;
    for (const a of list.slice(0, done)) await completeAssignment(userId, a.id);
    const next = list[done];
    if (next) {
      const meta = getJuzMeta(next.juzNumber)!;
      await recordReadingPosition(userId, meta.firstAyahId + Math.floor(meta.ayahCount * 0.42));
    }
  }
  await refreshGlobalStats();
  return true;
}
