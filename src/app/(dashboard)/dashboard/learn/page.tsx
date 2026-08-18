import type { Metadata } from "next";
import Link from "next/link";
import { requireOrgContext } from "~/lib/auth/current-org";
import LearnWorkNest from "./learn-worknest";

export const metadata: Metadata = { title: "Learn WorkNest - WorkNest" };

export default async function LearnPage() {
  const { user } = await requireOrgContext();
  return <div className="space-y-8"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#d92d27]">WorkNest Academy</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-neutral-950">Get more from your workspace</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">A practical guide for {user.name.split(" ")[0]}: learn the complete workflow, follow the setup path, and turn WorkNest into a reliable operating system for your team.</p></div><Link href="/dashboard" className="rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50">Back to dashboard</Link></div><LearnWorkNest /></div>;
}
