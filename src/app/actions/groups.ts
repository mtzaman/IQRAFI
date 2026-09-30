"use server";

import { revalidatePath } from "next/cache";
import { authedAction } from "@/server/actions";
import { enforceRateLimit } from "@/server/rate-limit";
import { track } from "@/server/services/analytics";
import {
  acceptInvitation,
  changeMemberRole,
  createGroup,
  createInvitation,
  deleteGroup,
  leaveGroup,
  removeMember,
  revokeInvitation,
  transferOwnership,
  updateGroup,
} from "@/server/services/groups";
import { rebalanceKhatma, startKhatma } from "@/server/services/khatmas";
import type { CreateGroupInput, UpdateGroupInput } from "@/lib/validation";

export async function createGroupAction(input: CreateGroupInput) {
  return authedAction(async (user) => {
    const group = await createGroup(user.id, input);
    void track("group_created", user.analyticsConsent, { schedule: group.schedule, mode: group.assignmentMode, kind: group.kind });
    revalidatePath("/groups");
    return { id: group.id };
  });
}

export async function startKhatmaAction(groupId: string) {
  return authedAction(async (user) => {
    const khatma = await startKhatma(user.id, groupId);
    revalidatePath(`/groups/${groupId}`);
    revalidatePath("/home");
    return { id: khatma.id };
  });
}

export async function updateGroupAction(groupId: string, input: UpdateGroupInput) {
  return authedAction(async (user) => {
    await updateGroup(user.id, groupId, input);
    revalidatePath(`/groups/${groupId}`, "layout");
    return null;
  });
}

export async function deleteGroupAction(groupId: string) {
  return authedAction(async (user) => {
    await deleteGroup(user.id, groupId);
    revalidatePath("/groups");
    revalidatePath("/home");
    return null;
  });
}

export async function leaveGroupAction(groupId: string) {
  return authedAction(async (user) => {
    await leaveGroup(user.id, groupId);
    revalidatePath("/groups");
    revalidatePath("/home");
    return null;
  });
}

export async function removeMemberAction(groupId: string, userId: string) {
  return authedAction(async (user) => {
    await removeMember(user.id, groupId, userId);
    revalidatePath(`/groups/${groupId}`, "layout");
    return null;
  });
}

export async function changeRoleAction(groupId: string, userId: string, role: "admin" | "member") {
  return authedAction(async (user) => {
    await changeMemberRole(user.id, groupId, userId, role);
    revalidatePath(`/groups/${groupId}`, "layout");
    return null;
  });
}

export async function transferOwnershipAction(groupId: string, userId: string) {
  return authedAction(async (user) => {
    await transferOwnership(user.id, groupId, userId);
    revalidatePath(`/groups/${groupId}`, "layout");
    return null;
  });
}

export async function createInvitationAction(groupId: string, input: { expiresInDays?: number | null; maxUses?: number | null }) {
  return authedAction(async (user) => {
    await enforceRateLimit("invitation", user.id);
    const inv = await createInvitation(user.id, groupId, input);
    void track("invitation_sent", user.analyticsConsent);
    revalidatePath(`/groups/${groupId}`, "layout");
    return { token: inv.token };
  });
}

export async function revokeInvitationAction(groupId: string, invitationId: string) {
  return authedAction(async (user) => {
    await revokeInvitation(user.id, invitationId);
    revalidatePath(`/groups/${groupId}`, "layout");
    return null;
  });
}

export async function acceptInvitationAction(token: string) {
  return authedAction(async (user) => {
    const { group, joined } = await acceptInvitation(user.id, token);
    if (joined) {
      void track("invitation_accepted", user.analyticsConsent);
      void track("group_joined", user.analyticsConsent);
    }
    revalidatePath("/groups");
    revalidatePath("/home");
    return { groupId: group.id, joined };
  });
}

export async function rebalanceAction(groupId: string, khatmaId: string) {
  return authedAction(async (user) => {
    const result = await rebalanceKhatma(user.id, khatmaId);
    revalidatePath(`/groups/${groupId}`);
    return result;
  });
}
