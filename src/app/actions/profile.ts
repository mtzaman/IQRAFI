"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { authedAction } from "@/server/actions";
import { getCurrentSession, SESSION_COOKIE } from "@/server/auth/current";
import { enforceRateLimit } from "@/server/rate-limit";
import { toggleBookmark } from "@/server/services/bookmarks";
import { blockUser, createReport, unblockUser } from "@/server/services/moderation";
import { markAllRead } from "@/server/services/notifications";
import { changePassword, deleteAccount, markOnboarded, updatePreferences, updateProfile } from "@/server/services/users";
import { track } from "@/server/services/analytics";

export async function updateProfileAction(input: unknown) {
  return authedAction(async (user) => {
    await updateProfile(user.id, input);
    revalidatePath("/", "layout");
    return null;
  });
}

export async function updatePreferencesAction(input: unknown) {
  return authedAction(async (user) => {
    await updatePreferences(user.id, input);
    revalidatePath("/", "layout");
    return null;
  });
}

/** Lightweight reader preference updates from the reading screen. */
export async function updateReaderPrefsAction(input: { readerTheme?: "light" | "dark" | "sepia"; readerFontScale?: number; showTranslation?: boolean }) {
  return authedAction(async (user) => {
    await updatePreferences(user.id, {
      theme: user.theme,
      readerTheme: input.readerTheme ?? user.readerTheme,
      readerFontScale: input.readerFontScale ?? user.readerFontScale,
      showTranslation: input.showTranslation ?? user.showTranslation,
      analyticsConsent: user.analyticsConsent,
      notificationPrefs: user.notificationPrefs,
    });
    return null;
  });
}

export async function changePasswordAction(current: string | null, next: string) {
  return authedAction(async (user) => {
    await changePassword(user.id, current, next);
    return null;
  });
}

export async function deleteAccountAction(confirmation: string) {
  const result = await authedAction(async (user) => {
    if (confirmation !== "DELETE") throw new (await import("@/server/errors")).AppError("validation");
    await deleteAccount(user.id);
    return null;
  });
  if (result.ok) {
    (await cookies()).delete(SESSION_COOKIE);
    redirect("/");
  }
  return result;
}

export async function markNotificationsReadAction() {
  return authedAction(async (user) => {
    await markAllRead(user.id);
    revalidatePath("/notifications");
    return null;
  });
}

export async function toggleBookmarkAction(ayahId: number) {
  return authedAction(async (user) => toggleBookmark(user.id, ayahId));
}

export async function reportAction(input: unknown) {
  return authedAction(async (user) => {
    await enforceRateLimit("report", user.id);
    await createReport(user.id, input);
    return null;
  });
}

export async function blockUserAction(userId: string) {
  return authedAction(async (user) => {
    await blockUser(user.id, userId);
    revalidatePath("/", "layout");
    return null;
  });
}

export async function unblockUserAction(userId: string) {
  return authedAction(async (user) => {
    await unblockUser(user.id, userId);
    revalidatePath("/profile/privacy");
    return null;
  });
}

export async function completeOnboardingAction() {
  const session = await getCurrentSession();
  if (session) {
    await markOnboarded(session.user.id);
    void track("onboarding_completed", session.user.analyticsConsent);
  }
}

/** Visitors' theme preference (signed-in users store theme on their profile). */
export async function setThemeCookieAction(theme: "system" | "light" | "dark") {
  (await cookies()).set("iqrafi_theme", theme, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
}
