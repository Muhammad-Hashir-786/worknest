import "server-only";
import { cookies } from "next/headers";
import {
  encryptSession,
  decryptSession,
  SESSION_COOKIE_NAME,
  SESSION_DURATION_SECONDS,
  type SessionPayload,
} from "./jwt";

export async function createSession(userId: string): Promise<void> {
  const token = await encryptSession({ userId });
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return decryptSession(token);
}
