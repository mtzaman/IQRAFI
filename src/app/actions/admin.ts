"use server";

import { revalidatePath } from "next/cache";
import { authedAction } from "@/server/actions";
import { requirePlatformAdmin, resolveReport, setUserSuspended, type ModerationAction } from "@/server/services/moderation";
import { refreshGlobalStats } from "@/server/services/stats";

export async function resolveReportAction(reportId: string, action: ModerationAction) {
  return authedAction(async (user) => {
    await resolveReport(user.id, reportId, action);
    revalidatePath("/admin");
    return null;
  });
}

export async function setSuspendedAction(userId: string, suspended: boolean) {
  return authedAction(async (user) => {
    await setUserSuspended(user.id, userId, suspended);
    revalidatePath("/admin");
    return null;
  });
}

export async function refreshStatsAction() {
  return authedAction(async (user) => {
    await requirePlatformAdmin(user.id);
    await refreshGlobalStats();
    revalidatePath("/admin");
    return null;
  });
}
