import type { Metadata } from "next";
import { requireOrgContext } from "~/lib/auth/current-org";
import OrganizationSettingsForm from "./organization-settings-form";

export const metadata: Metadata = { title: "Organization settings - WorkNest" };

export default async function OrganizationSettingsPage() {
  const { organization, role } = await requireOrgContext();
  const canEdit = role === "owner" || role === "admin";

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-semibold text-neutral-900">Organization settings</h1>
      <p className="mt-1 text-sm text-neutral-600">
        Workspace slug: <span className="font-mono text-neutral-800">{organization.slug}</span>
      </p>

      <div className="mt-6">
        <OrganizationSettingsForm organization={organization} canEdit={canEdit} />
      </div>
    </div>
  );
}
