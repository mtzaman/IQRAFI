"use server";

import { revalidatePath } from "next/cache";
import { authedAction } from "@/server/actions";
import { track } from "@/server/services/analytics";
import { deleteDedication, saveDedication } from "@/server/services/dedications";
import type { DedicationInput } from "@/lib/validation";

export async function saveDedicationAction(khatmaId: string, input: DedicationInput) {
  return authedAction(async (user) => {
    const d = await saveDedication(user.id, khatmaId, input);
    void track("dedication_created", user.analyticsConsent, { type: d.type, visibility: d.visibility });
    revalidatePath(`/khatma/${khatmaId}`);
    revalidatePath("/profile/dedications");
    return { id: d.id };
  });
}

export async function deleteDedicationAction(khatmaId: string, dedicationId: string) {
  return authedAction(async (user) => {
    await deleteDedication(user.id, dedicationId);
    revalidatePath(`/khatma/${khatmaId}`);
    revalidatePath("/profile/dedications");
    return null;
  });
}
