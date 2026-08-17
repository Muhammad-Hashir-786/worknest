"use server";

import { redirect } from "next/navigation";
import connectDB from "../lib/db";
import User from "../models/user";
import { signupSchema, loginSchema } from "../lib/validations/auth";
import { hashPassword, verifyPassword } from "../lib/auth/password";
import { createSession, deleteSession } from "../lib/auth/session";
import { safeRedirectTarget } from "../lib/auth/redirect";

export interface AuthActionState {
  error?: string;
  fieldErrors?: Partial<Record<string, string>>;
}

export async function signup(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString();
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  const { name, email, password } = parsed.data;
  const redirectTo = safeRedirectTarget(formData.get("redirectTo"));

  await connectDB();

  const existing = await User.findOne({ email }).select("_id").lean();
  if (existing) {
    return { fieldErrors: { email: "An account with this email already exists." } };
  }

  const passwordHash = await hashPassword(password);
  const user = await User.create({ name, email, passwordHash });

  await createSession(user._id.toString());

  redirect(redirectTo);
}

export async function login(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Enter a valid email and password." };
  }

  const { email, password } = parsed.data;
  const redirectTo = safeRedirectTarget(formData.get("redirectTo"));

  await connectDB();

  // passwordHash has select: false on the schema, so it must be explicitly
  // requested here - every other query in the app gets it excluded for free.
  const user = await User.findOne({ email }).select("+passwordHash");

  // Same generic message whether the email doesn't exist or the password is
  // wrong, so a failed login can't be used to enumerate registered emails.
  if (!user) {
    return { error: "Invalid email or password." };
  }

  const validPassword = await verifyPassword(password, user.passwordHash);
  if (!validPassword) {
    return { error: "Invalid email or password." };
  }

  await createSession(user._id.toString());

  redirect(redirectTo);
}

export async function logout(): Promise<void> {
  await deleteSession();
  redirect("/login");
}
