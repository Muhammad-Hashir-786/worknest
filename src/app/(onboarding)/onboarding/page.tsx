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

  // Nothing to choose from yet - skip straight to creating the first one.
  if (organizations.length === 0) {
    redirect("/onboarding/create");
  }

  return (
    <div className="w-full max-w-sm">
      <h1 className="mb-1 text-center text-2xl font-semibold text-neutral-900">
        Choose a workspace
      </h1>
      <p className="mb-6 text-center text-sm text-neutral-600">
        Pick the organization you want to work in.
      </p>

      <div className="space-y-2">
        {organizations.map(({ organization, role }) => (
          <form key={organization.id} action={switchOrganization}>
            <input type="hidden" name="organizationId" value={organization.id} />
            <button
              type="submit"
              className="flex w-full items-center justify-between rounded-md border border-neutral-200 bg-white px-4 py-3 text-left hover:border-neutral-400"
            >
              <span className="font-medium text-neutral-900">{organization.name}</span>
              <span className="text-xs uppercase tracking-wide text-neutral-500">{role}</span>
            </button>
          </form>
        ))}
      </div>

      <Link
        href="/onboarding/create"
        className="mt-4 block text-center text-sm font-medium text-neutral-900 underline"
      >
        Create a new organization
      </Link>
    </div>
  );
}
