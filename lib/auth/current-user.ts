import "server-only";
import connectDB from "../../lib/db";
import User from "../../models/user";
import { getSession } from "./session";

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
}

/**
 * Resolves the current session cookie to a real user record.
 * This is the authoritative auth check - the proxy.ts redirect is only a
 * fast, UX-level shortcut based on JWT validity alone. Anything that
 * actually touches data must call this (directly or via a layout that
 * calls it) rather than trust the URL the request arrived at.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await getSession();
  if (!session?.userId) return null;

  await connectDB();

  const user = await User.findById(session.userId)
    .select("name email avatar")
    .lean();

  if (!user) return null;

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    avatar: user.avatar,
  };
}
