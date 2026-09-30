/**
 * OAuth providers. Each is enabled only when its credentials are configured, so the
 * app runs locally without them. Tokens are validated server-side; only verified
 * emails are linked to accounts.
 */
import { Apple, Google } from "arctic";

const appUrl = () => process.env.APP_URL ?? "http://localhost:3000";

export function googleProvider(): Google | null {
  const { GOOGLE_CLIENT_ID: id, GOOGLE_CLIENT_SECRET: secret } = process.env;
  if (!id || !secret) return null;
  return new Google(id, secret, `${appUrl()}/auth/google/callback`);
}

export function appleProvider(): Apple | null {
  const { APPLE_CLIENT_ID: clientId, APPLE_TEAM_ID: teamId, APPLE_KEY_ID: keyId, APPLE_PRIVATE_KEY: pem } = process.env;
  if (!clientId || !teamId || !keyId || !pem) return null;
  const base64 = pem.replace(/\\n/g, "\n").replace(/-----[^-]+-----/g, "").replace(/\s/g, "");
  const key = Uint8Array.from(Buffer.from(base64, "base64"));
  return new Apple(clientId, teamId, keyId, key, `${appUrl()}/auth/apple/callback`);
}

export const oauthAvailability = () => ({ google: googleProvider() !== null, apple: appleProvider() !== null });

/** Decodes a JWT payload that was received directly from the provider's token endpoint over TLS. */
export function decodeIdTokenClaims(idToken: string): Record<string, unknown> {
  const payload = idToken.split(".")[1];
  if (!payload) throw new Error("Malformed id token");
  return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Record<string, unknown>;
}
