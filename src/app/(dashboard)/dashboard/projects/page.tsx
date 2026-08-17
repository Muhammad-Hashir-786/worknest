import type { Metadata } from "next";
import Link from "next/link";
import { requireOrgContext } from "~/lib/auth/current-org";
import { can } from "~/lib/permissions/permissions";
import { getProjectsForOrg } from "~/services/project";
import { projectFiltersSchema } from "~/lib/validations/project";
import ProjectFilters from "./project-filters";
import ProjectCard from "./project-card";
import PageHeader from "~/components/ui/page-header";
import EmptyState from "~/components/ui/empty-state";

export const metadata: Metadata = { title: "Projects - WorkNest" };

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { organization, role } = await requireOrgContext();
  const params = await searchParams;

  const filters = projectFiltersSchema.parse({
    status: firstValue(params.status),
    priority: firstValue(params.priority),
    search: firstValue(params.search),
  });

  const projects = await getProjectsForOrg(organization.id, filters);
  const canCreate = can(role, "projects:create");

  return (
    <div className="space-y-6">
      <PageHeader title="Projects" description={`${projects.length} project${projects.length === 1 ? "" : "s"} in ${organization.name}.`} action={canCreate && (
          <Link
            href="/dashboard/projects/new"
            className="rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm"
          >
            + New project
          </Link>
        )}/>

      <ProjectFilters initialFilters={filters} />

      {projects.length === 0 ? (
        <EmptyProjects hasFilters={Boolean(filters.status || filters.priority || filters.search)} canCreate={canCreate} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function EmptyProjects({ hasFilters, canCreate }: { hasFilters: boolean; canCreate: boolean }) {
  return <EmptyState title={hasFilters ? "No matching projects" : "Your project space is ready"} description={hasFilters ? "Try widening your search or changing a filter." : "Create a project to organize work, people, and deadlines."} action={!hasFilters && canCreate ? <Link href="/dashboard/projects/new" className="inline-flex rounded-lg bg-[#d92d27] px-4 py-2 text-sm font-semibold text-white">Create project</Link> : undefined} />;
}
