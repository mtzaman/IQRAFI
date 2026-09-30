"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isLocale, LOCALE_COOKIE } from "@/i18n/config";
import { clientIp, endSession, getCurrentSession, safeNextPath, startSession } from "@/server/auth/current";
import { isAppError, type ErrorCode } from "@/server/errors";
import { consumeRateLimit } from "@/server/rate-limit";
import { track } from "@/server/services/analytics";
import { authenticateWithPassword, registerWithPassword } from "@/server/services/users";
import { isValidTimezone } from "@/lib/khatma/schedule";
import { ZodError } from "zod";

export type AuthFormState = { error?: ErrorCode | "generic"; fields?: Record<string, string>; values?: { name?: string; email?: string } };

function formError(e: unknown, values: AuthFormState["values"]): AuthFormState {
  if (isAppError(e)) return { error: e.code, values };
  if (e instanceof ZodError) {
    const fields: Record<string, string> = {};
    for (const issue of e.issues) fields[String(issue.path[0])] ??= issue.message;
    return { error: "validation", fields, values };
  }
  console.error("[auth] unexpected error", e);
  return { error: "generic", values };
}

export async function signupAction(_prev: AuthFormState, form: FormData): Promise<AuthFormState> {
  const values = { name: String(form.get("name") ?? ""), email: String(form.get("email") ?? "") };
  const next = safeNextPath(form.get("next"), "/groups/new?welcome=1");
  try {
    if (!(await consumeRateLimit("signup", await clientIp())).allowed) return { error: "rate_limited", values };
    const tz = String(form.get("timezone") ?? "UTC");
    const lang = (await cookies()).get(LOCALE_COOKIE)?.value;
    const user = await registerWithPassword(
      { name: values.name || null, email: values.email, password: String(form.get("password") ?? "") },
      { timezone: isValidTimezone(tz) ? tz : "UTC", language: isLocale(lang) ? lang : "en" },
    );
    await startSession(user.id);
    void track("onboarding_completed", form.get("analytics") === "on");
  } catch (e) {
    return formError(e, values);
  }
  redirect(next);
}

export async function loginAction(_prev: AuthFormState, form: FormData): Promise<AuthFormState> {
  const values = { email: String(form.get("email") ?? "") };
  const next = safeNextPath(form.get("next"));
  try {
    const ip = await clientIp();
    const limitKey = `${ip}:${values.email.trim().toLowerCase()}`;
    if (!(await consumeRateLimit("login", limitKey)).allowed) return { error: "rate_limited", values };
    const user = await authenticateWithPassword({ email: values.email, password: String(form.get("password") ?? "") });
    await startSession(user.id);
  } catch (e) {
    return formError(e, values);
  }
  redirect(next);
}

export async function logoutAction() {
  await endSession();
  redirect("/");
}

/** Sets the UI language for visitors; signed-in users store it on their profile instead. */
export async function setLocaleCookieAction(locale: string) {
  if (!isLocale(locale)) return;
  (await cookies()).set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  const session = await getCurrentSession();
  if (session) {
    const { db } = await import("@/lib/db");
    const { users } = await import("@/lib/db/schema");
    const { eq } = await import("drizzle-orm");
    await db.update(users).set({ language: locale }).where(eq(users.id, session.user.id));
  }
}
