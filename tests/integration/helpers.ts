import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { acceptInvitation, createGroup, getGroupOverview } from "@/server/services/groups";
import type { CreateGroupInput } from "@/lib/validation";

let counter = 0;

/** Creates a user directly (password hashing is covered by the auth tests). */
export async function makeUser(name = "Reader") {
  counter++;
  const [user] = await db
    .insert(users)
    .values({ email: `${name.toLowerCase()}${counter}@test.iqrafi.com`, name })
    .returning();
  return user!;
}

export async function makeGroupWithMembers(memberCount: number, overrides: Partial<CreateGroupInput> = {}) {
  const owner = await makeUser("Owner");
  const group = await createGroup(owner.id, {
    name: "Family Khatma",
    schedule: "weekly",
    timezone: "UTC",
    assignmentMode: "automatic",
    recurring: true,
    rotate: true,
    kind: "standard",
    ...overrides,
  });
  const overview = await getGroupOverview(owner.id, group.id);
  const members = [owner];
  for (let i = 1; i < memberCount; i++) {
    const u = await makeUser(`Member${i}`);
    await acceptInvitation(u.id, overview.shareInvite!.token);
    members.push(u);
  }
  return { owner, group, members, inviteToken: overview.shareInvite!.token };
}
