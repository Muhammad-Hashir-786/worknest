"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signup, type AuthActionState } from "~/actions/auth";

const initialState: AuthActionState = {};

export default function SignupForm({ redirectTo }: { redirectTo: string }) {
  const [state, formAction, pending] = useActionState(signup, initialState);
  const loginHref =
    redirectTo === "/dashboard" ? "/login" : `/login?next=${encodeURIComponent(redirectTo)}`;

  return (
    <form action={formAction} className="w-full space-y-5">
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <div>
        <label htmlFor="name" className="block text-sm font-semibold text-neutral-800">
          Full name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          autoComplete="name"
          placeholder="Your name"
          className="mt-2 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-900 outline-none placeholder:text-neutral-400"
        />
        {state.fieldErrors?.name && (
          <p className="mt-1 text-sm text-red-600">{state.fieldErrors.name}</p>
        )}
      </div>

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
        {state.fieldErrors?.email && (
          <p className="mt-1 text-sm text-red-600">{state.fieldErrors.email}</p>
        )}
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
          autoComplete="new-password"
          placeholder="At least 8 characters"
          className="mt-2 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-900 outline-none placeholder:text-neutral-400"
        />
        {state.fieldErrors?.password && (
          <p className="mt-1 text-sm text-red-600">{state.fieldErrors.password}</p>
        )}
      </div>

      {state.error && <p className="rounded-xl border border-red-100 bg-red-50 px-3 py-2.5 text-sm text-red-700">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-[#d92d27] px-4 py-3 text-sm font-bold text-white shadow-lg shadow-red-200 transition hover:-translate-y-0.5 hover:bg-[#b42318] disabled:translate-y-0 disabled:opacity-50"
      >
        {pending ? "Creating account..." : "Create account"}
      </button>

      <p className="pt-1 text-center text-sm text-neutral-500">
        Already have an account?{" "}
        <Link href={loginHref} className="font-semibold text-[#c32621] hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
