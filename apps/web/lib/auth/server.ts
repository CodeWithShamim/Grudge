import "server-only";
import { PrivyClient } from "@privy-io/server-auth";

/**
 * Server-side Privy token verification for protected Route Handlers. The client
 * sends its Privy access token as `Authorization: Bearer <token>`; we verify it
 * with the app secret before allowing any privileged / mutating action.
 *
 * Verification is only ENFORCED when both Privy env vars are present. In
 * mock-mode dev (no Privy configured) routes stay open so `pnpm dev` works
 * zero-config — production must set both vars.
 */

let client: PrivyClient | null = null;

function getClient(): PrivyClient | null {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const secret = process.env.PRIVY_APP_SECRET;
  if (!appId || !secret) return null;
  client ??= new PrivyClient(appId, secret);
  return client;
}

export interface VerifiedUser {
  userId: string;
}

/**
 * Verify the caller's Privy token from a request. Returns the user when valid.
 * Throws when Privy IS configured and the token is missing/invalid. Returns
 * null (open) only when Privy is not configured at all.
 */
export async function verifyRequest(req: Request): Promise<VerifiedUser | null> {
  const privy = getClient();
  if (!privy) return null; // not configured → open (mock/dev)

  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) throw new Error("Missing Privy access token");

  const claims = await privy.verifyAuthToken(token);
  return { userId: claims.userId };
}
