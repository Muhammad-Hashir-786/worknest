import type { Metadata } from "next";
import LoginForm from "./login-form";
import { safeRedirectTarget } from "~/lib/auth/redirect";

export const metadata: Metadata = { title: "Log in - WorkNest" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const redirectTo = safeRedirectTarget(next);

  return (
    <div className="w-full">
      <div className="mb-9"><div className="mb-6 inline-flex items-center gap-2 lg:hidden"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#e3342f] text-sm font-bold text-white">W</span><span className="font-bold tracking-tight text-neutral-900">WorkNest</span></div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#d92d27]">Welcome back</p><h1 className="mt-3 text-4xl font-bold tracking-[-0.04em] text-neutral-950">Sign in to your workspace.</h1><p className="mt-3 text-sm leading-6 text-neutral-500">Pick up where your team left off.</p></div>
      <LoginForm redirectTo={redirectTo} />
    </div>
  );
}
