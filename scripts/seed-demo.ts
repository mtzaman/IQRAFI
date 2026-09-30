/**
 * Development demo data — clearly labelled (is_demo = true, @demo.iqrafi.com emails).
 * Uses the real services so every figure (including global statistics) is derived from
 * genuine database activity. Refuses to run in production.
 */
import "dotenv/config";
import { and, asc, eq } from "drizzle-orm";
import { closeDb, db } from "../src/lib/db";
import { assignments, groups, khatmas, users } from "../src/lib/db/schema";
import { hashPassword } from "../src/server/auth/password";
import { completeAssignment, recordReadingPosition } from "../src/server/services/assignments";
import { saveDedication } from "../src/server/services/dedications";
import { acceptInvitation, createGroup, getGroupOverview } from "../src/server/services/groups";
import { startKhatma } from "../src/server/services/khatmas";
import { refreshGlobalStats } from "../src/server/services/stats";
import { getJuzMeta } from "../src/server/quran/reader";

if (process.env.NODE_ENV === "production" && !process.argv.includes("--force")) {
  console.error("Refusing to seed demo data in production.");
  process.exit(1);
}

const DEMO_PASSWORD = "demo-password-123";
const PEOPLE = ["Ahmed", "Sara", "Ali", "Fatima", "Yusuf"];

const existing = await db.select({ id: users.id }).from(users).where(eq(users.isDemo, true));
if (existing.length) {
  console.log("Demo data already present. Delete demo users first to reseed.");
  await closeDb();
  process.exit(0);
}

const passwordHash = await hashPassword(DEMO_PASSWORD);
const people = await db
  .insert(users)
  .values(
    PEOPLE.map((name, i) => ({
      name,
      email: `${name.toLowerCase()}@demo.iqrafi.com`,
      passwordHash,
      isDemo: true,
      timezone: ["Europe/London", "Asia/Karachi", "America/New_York", "Asia/Dubai", "Asia/Jakarta"][i]!,
      platformRole: i === 0 ? ("admin" as const) : ("user" as const),
      onboardedAt: new Date(),
    })),
  )
  .returning();
const [ahmed] = people;

const group = await createGroup(ahmed!.id, {
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
const token = (await getGroupOverview(ahmed!.id, group.id)).shareInvite!.token;
for (const p of people.slice(1)) await acceptInvitation(p.id, token);

// Cycle 1: fully completed (the next cycle starts automatically), with a private dedication.
const first = await startKhatma(ahmed!.id, group.id);
for (const a of await db.select().from(assignments).where(eq(assignments.khatmaId, first.id)).orderBy(asc(assignments.juzNumber))) {
  await completeAssignment(a.userId!, a.id);
}
await saveDedication(ahmed!.id, first.id, { type: "in_memory", name: "Ahmed Khan", visibility: "private" });
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
console.log(`Seeded demo group "${group.name}" (${group.id}) with ${people.length} demo users.`);
console.log(`Sign in as ahmed@demo.iqrafi.com (platform admin) or ${PEOPLE.slice(1).map((n) => n.toLowerCase() + "@demo.iqrafi.com").join(", ")}`);
console.log(`Demo password (development only): ${DEMO_PASSWORD}`);
await closeDb();
