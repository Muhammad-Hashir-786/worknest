import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireOrgContext } from "~/lib/auth/current-org";
import { can } from "~/lib/permissions/permissions";
import { getClientsForOrg } from "~/services/client";
import NewProjectForm from "./new-project-form";

export const metadata: Metadata = { title: "New Project - WorkNest" };

export default async function NewProjectPage() {
  const { organization, role } = await requireOrgContext();

  if (!can(role, "projects:create")) {
    redirect("/dashboard/projects");
  }

  const clients = await getClientsForOrg(organization.id);

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold text-neutral-900">New project</h1>
      <p className="mt-1 text-sm text-neutral-600">Create a project in {organization.name}.</p>

      <div className="mt-6">
        <NewProjectForm clients={clients} />
      </div>
    </div>
  );
}
