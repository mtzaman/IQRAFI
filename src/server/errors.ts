/**
 * Domain errors. `code` maps to a human, translated message in the UI; internal details
 * never leak to the client.
 */
export type ErrorCode =
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "validation"
  | "rate_limited"
  | "invitation_invalid"
  | "already_claimed"
  | "email_taken"
  | "invalid_credentials"
  | "account_suspended";

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message?: string,
  ) {
    super(message ?? code);
    this.name = "AppError";
  }
}

export const isAppError = (e: unknown): e is AppError => e instanceof AppError;

export function assert(condition: unknown, code: ErrorCode, message?: string): asserts condition {
  if (!condition) throw new AppError(code, message);
}
