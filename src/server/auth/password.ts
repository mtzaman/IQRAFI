import { hash, verify } from "@node-rs/argon2";

// OWASP-recommended Argon2id parameters.
const OPTIONS = { memoryCost: 19456, timeCost: 2, outputLen: 32, parallelism: 1 } as const;

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export function hashPassword(password: string): Promise<string> {
  return hash(password, OPTIONS);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}
