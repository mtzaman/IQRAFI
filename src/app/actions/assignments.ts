"use server";

import { revalidatePath } from "next/cache";
import { authedAction } from "@/server/actions";
import { track } from "@/server/services/analytics";
import { claimAssignment, completeAssignment, reassignAssignment, releaseAssignment, requestHelp } from "@/server/services/assignments";

function refresh(groupId?: string) {
  revalidatePath("/home");
  if (groupId) revalidatePath(`/groups/${groupId}`);
}

/** Idempotent: repeating the call after a network failure is safe. */
export async function completeAssignmentAction(assignmentId: string) {
  return authedAction(async (user) => {
    const result = await completeAssignment(user.id, assignmentId);
    if (!result.alreadyCompleted) {
      void track("juz_completed", user.analyticsConsent);
      if (result.khatmaCompleted) void track("khatma_completed", user.analyticsConsent);
    }
    refresh(result.groupId);
    return result;
  });
}

export async function requestHelpAction(assignmentId: string, groupId: string) {
  return authedAction(async (user) => {
    await requestHelp(user.id, assignmentId);
    refresh(groupId);
    return null;
  });
}

export async function releaseAssignmentAction(assignmentId: string, groupId: string) {
  return authedAction(async (user) => {
    await releaseAssignment(user.id, assignmentId);
    refresh(groupId);
    return null;
  });
}

export async function claimAssignmentAction(assignmentId: string, groupId: string) {
  return authedAction(async (user) => {
    const a = await claimAssignment(user.id, assignmentId);
    refresh(groupId);
    return { juzNumber: a.juzNumber, assignmentId: a.id };
  });
}

export async function reassignAssignmentAction(assignmentId: string, groupId: string, toUserId: string | null) {
  return authedAction(async (user) => {
    await reassignAssignment(user.id, assignmentId, toUserId);
    refresh(groupId);
    return null;
  });
}
