import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOrgContext } from "~/lib/auth/current-org";
import { can } from "~/lib/permissions/permissions";
import { getProjectForOrg, getProjectMembers, getAddableOrgMembers } from "~/services/project";
import { getClientsForOrg } from "~/services/client";
import { getTasksForProject } from "~/services/task";
import ProjectEditForm from "./project-edit-form";
import ProjectMembers from "./project-members";
import DeleteProjectForm from "./delete-project-form";
import Milestones from "./milestones";
import { getMilestones } from "~/services/milestone";
import { getInvoices, getProjectFinance } from "~/services/finance";
import FinancePanel from "./finance-panel";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ projectId: string }>;
}): Promise<Metadata> {
  const { projectId } = await params;
  return { title: `Project ${projectId} - WorkNest` };
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { organization, role } = await requireOrgContext();

  // getProjectForOrg only returns a result if the project belongs to the
  // caller's active organization - a project id from another org 404s here
  // exactly the same as one that doesn't exist at all.
  const project = await getProjectForOrg(projectId, organization.id);
  if (!project) notFound();

  const canEdit = can(role, "projects:update");
  const canDelete = can(role, "projects:delete");
  const canManageMembers = can(role, "projects:manageMembers");

  const [clients, members, addableMembers, tasks, milestones, finance, invoices] = await Promise.all([
    getClientsForOrg(organization.id),
    getProjectMembers(projectId),
    canManageMembers ? getAddableOrgMembers(projectId, organization.id) : Promise.resolve([]),
    getTasksForProject(projectId, organization.id),
    getMilestones(projectId, organization.id),
    getProjectFinance(projectId, organization.id),
    getInvoices(projectId, organization.id),
  ]);

  return (
    <div className="max-w-3xl space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-neutral-500">
            {project.client.name} · Created by {project.createdBy?.name ?? "Unknown"}
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-neutral-900">{project.name}</h1>
        </div>
        <Link
          href={`/dashboard/projects/${projectId}/tasks`}
          className="shrink-0 rounded-xl bg-[#d92d27] px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-red-200 transition hover:-translate-y-0.5 hover:bg-[#b42318]"
        >
          View tasks ({tasks.length})
        </Link>
      </div>

      <section>
        <Milestones projectId={projectId} milestones={milestones} canManage={canEdit} />
      </section>

      <section>
        <FinancePanel projectId={projectId} finance={finance} invoices={invoices} canManage={canEdit} />
      </section>

      <section>
        <h2 className="text-sm font-medium text-neutral-900">Project details</h2>
        <div className="mt-2">
          <ProjectEditForm project={project} clients={clients} canEdit={canEdit} />
        </div>
      </section>

      <section>
        <h2 className="text-sm font-medium text-neutral-900">Members</h2>
        <div className="mt-2">
          <ProjectMembers
            projectId={project.id}
            members={members}
            addableMembers={addableMembers}
            canManage={canManageMembers}
          />
        </div>
      </section>

      {canDelete && (
        <section className="border-t border-neutral-200 pt-6">
          <h2 className="text-sm font-medium text-red-600">Danger zone</h2>
          <p className="mt-1 text-sm text-neutral-600">
            Deleting a project permanently removes it and its membership records.
          </p>
          <div className="mt-2">
            <DeleteProjectForm projectId={project.id} projectName={project.name} />
          </div>
        </section>
      )}
    </div>
  );
}
