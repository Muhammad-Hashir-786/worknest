// This module is deliberately kept free of `next/headers` so it can run in
// both the Node.js runtime (server actions, server components) and the Edge
// runtime (middleware). Cookie reading/writing lives in session.ts instead.
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE_NAME = "worknest_session";
export const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getSecretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("Define AUTH_SECRET in .env.local");
  }
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  userId: string;
}

export async function encryptSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSecretKey());
}

export async function decryptSession(
  token: string | undefined
): Promise<SessionPayload | null> {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      algorithms: ["HS256"],
    });

    if (typeof payload.userId !== "string") return null;
    return { userId: payload.userId };
  } catch {
    // Expired, malformed, or signed with a different secret - all treated
    // as "no session" rather than surfacing the specific reason to the client.
    return null;
  }
}
