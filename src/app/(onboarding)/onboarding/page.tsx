import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "~/lib/auth/current-user";
import { getUserOrganizations } from "~/services/organization";
import { switchOrganization } from "~/actions/organization";

export const metadata: Metadata = { title: "Choose workspace - WorkNest" };

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const organizations = await getUserOrganizations(user.id);

  return (
    <div className="w-full max-w-3xl">
      <div className="text-center"><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#d92d27]">Welcome to WorkNest</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-neutral-950">Where would you like to work?</h1><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-neutral-600">You do not need to create an organization to get started. Explore your personal workspace, join a team, or create a workspace for your own organization.</p></div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <Link href="/onboarding/personal" className="group rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-red-200 hover:shadow-lg"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-neutral-100 text-lg text-neutral-700">✦</span><h2 className="mt-4 font-bold text-neutral-900">Personal workspace</h2><p className="mt-2 text-sm leading-5 text-neutral-500">Learn WorkNest, keep personal notes, and prepare before joining a team.</p><span className="mt-4 block text-sm font-bold text-[#d92d27]">Continue privately →</span></Link>
        <Link href="/onboarding/create" className="group rounded-2xl border border-red-200 bg-red-50/50 p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#d92d27] text-lg text-white">＋</span><h2 className="mt-4 font-bold text-neutral-900">Create organization</h2><p className="mt-2 text-sm leading-5 text-neutral-600">Set up a workspace, invite your team, and manage projects as an owner.</p><span className="mt-4 block text-sm font-bold text-[#d92d27]">Create workspace →</span></Link>
        <Link href="/onboarding/join" className="group rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-red-200 hover:shadow-lg"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-neutral-100 text-lg text-neutral-700">↗</span><h2 className="mt-4 font-bold text-neutral-900">Join organization</h2><p className="mt-2 text-sm leading-5 text-neutral-500">Accept an invitation or request access to an organization you work with.</p><span className="mt-4 block text-sm font-bold text-[#d92d27]">Find your team →</span></Link>
      </div>

      {organizations.length > 0 && <div className="mt-8 rounded-2xl border border-neutral-200 bg-white p-5"><h2 className="font-bold text-neutral-900">Your organizations</h2><p className="mt-1 text-sm text-neutral-500">Return to a workspace you already belong to.</p><div className="mt-4 grid gap-2 sm:grid-cols-2">{organizations.map(({ organization, role }) => <form key={organization.id} action={switchOrganization}><input type="hidden" name="organizationId" value={organization.id} /><button type="submit" className="flex w-full items-center justify-between rounded-xl border border-neutral-100 px-4 py-3 text-left hover:border-red-200 hover:bg-red-50/40"><span className="font-medium text-neutral-900">{organization.name}</span><span className="text-xs uppercase tracking-wide text-neutral-500">{role}</span></button></form>)}</div></div>}

    </div>
  );
}
