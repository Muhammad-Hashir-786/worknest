import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireOrgContext } from "~/lib/auth/current-org";
import { can } from "~/lib/permissions/permissions";
import { getProjectForOrg, getProjectMembers } from "~/services/project";
import NewTaskForm from "./new-task-form";
import { getTaskTemplates } from "~/services/task-template";
import { TemplateCreator } from "./task-templates";

export const metadata: Metadata = { title: "New task - WorkNest" };

export default async function NewTaskPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { organization, role } = await requireOrgContext();

  if (!can(role, "tasks:create")) {
    redirect(`/dashboard/projects/${projectId}/tasks`);
  }

  const project = await getProjectForOrg(projectId, organization.id);
  if (!project) notFound();

  const [members, templates] = await Promise.all([getProjectMembers(projectId), getTaskTemplates(organization.id, projectId)]);

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <p className="text-sm text-neutral-500">{project.name}</p>
        <h1 className="mt-1 text-2xl font-semibold text-neutral-900">New task</h1>
      </div>
      <NewTaskForm projectId={projectId} members={members} templates={templates} />
      {can(role, "tasks:create") && <TemplateCreator projectId={projectId} />}
    </div>
  );
}
