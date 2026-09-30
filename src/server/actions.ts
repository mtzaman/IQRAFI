import { ZodError } from "zod";
import { getCurrentSession } from "./auth/current";
import { isAppError, type ErrorCode } from "./errors";
import { enforceRateLimit } from "./rate-limit";
import type { SessionUser } from "./auth/session";

export type ActionResult<T = null> = { ok: true; data: T } | { ok: false; error: ErrorCode | "generic"; fields?: Record<string, string> };

function toResult(e: unknown): ActionResult<never> {
  if (isAppError(e)) return { ok: false, error: e.code };
  if (e instanceof ZodError) {
    const fields: Record<string, string> = {};
    for (const issue of e.issues) fields[issue.path.join(".")] ??= issue.message;
    return { ok: false, error: "validation", fields };
  }
  // Unexpected: log server-side only; the client receives a human, generic message.
  console.error("[action] unexpected error", e);
  return { ok: false, error: "generic" };
}

/** Wraps a server action: resolves the signed-in user, applies rate limiting and maps errors. */
export async function authedAction<T>(fn: (user: SessionUser) => Promise<T>): Promise<ActionResult<T>> {
  try {
    const session = await getCurrentSession();
    if (!session) return { ok: false, error: "unauthorized" };
    await enforceRateLimit("mutation", session.user.id);
    return { ok: true, data: await fn(session.user) };
  } catch (e) {
    return toResult(e);
  }
}

export async function publicAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    return toResult(e);
  }
}
