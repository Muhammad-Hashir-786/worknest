"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login, type AuthActionState } from "~/actions/auth";

const initialState: AuthActionState = {};

export default function LoginForm({ redirectTo }: { redirectTo: string }) {
  const [state, formAction, pending] = useActionState(login, initialState);
  const signupHref =
    redirectTo === "/dashboard" ? "/signup" : `/signup?next=${encodeURIComponent(redirectTo)}`;

  return (
    <form action={formAction} className="w-full space-y-5">
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <div>
        <label htmlFor="email" className="block text-sm font-semibold text-neutral-800">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@company.com"
          className="mt-2 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-900 outline-none placeholder:text-neutral-400"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-semibold text-neutral-800">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="Enter your password"
          className="mt-2 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-900 outline-none placeholder:text-neutral-400"
        />
      </div>

      {state.error && <p className="rounded-xl border border-red-100 bg-red-50 px-3 py-2.5 text-sm text-red-700">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-[#d92d27] px-4 py-3 text-sm font-bold text-white shadow-lg shadow-red-200 transition hover:-translate-y-0.5 hover:bg-[#b42318] disabled:translate-y-0 disabled:opacity-50"
      >
        {pending ? "Signing in..." : "Sign in"}
      </button>

      <p className="pt-1 text-center text-sm text-neutral-500">
        Don&apos;t have an account?{" "}
        <Link href={signupHref} className="font-semibold text-[#c32621] hover:underline">
          Sign up
        </Link>
      </p>
    </form>
  );
}
