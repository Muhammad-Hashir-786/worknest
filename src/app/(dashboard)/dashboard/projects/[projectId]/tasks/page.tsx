import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOrgContext } from "~/lib/auth/current-org";
import { can } from "~/lib/permissions/permissions";
import { getProjectForOrg, getProjectMembers } from "~/services/project";
import { getTasksForProject } from "~/services/task";
import { taskFiltersSchema } from "~/lib/validations/task";
import TaskFilters from "./task-filters";
import TaskWorkspace from "./task-workspace";
import SavedViews from "./saved-views";
import { getSavedViews } from "~/services/saved-view";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ projectId: string }>;
}): Promise<Metadata> {
  const { projectId } = await params;
  return { title: `Tasks - Project ${projectId} - WorkNest` };
}

export default async function TasksPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { projectId } = await params;
  const { organization, role, user } = await requireOrgContext();
  const query = await searchParams;

  const project = await getProjectForOrg(projectId, organization.id);
  if (!project) notFound();

  const filters = taskFiltersSchema.parse({
    status: firstValue(query.status),
    priority: firstValue(query.priority),
    assignee: firstValue(query.assignee),
    search: firstValue(query.search),
  });

  // "me" is a URL-friendly sentinel for "the signed-in user" - resolved to
  // a real id here rather than in the service layer, which has no access
  // to the session.
  const assigneeId = filters.assignee === "me" ? user.id : filters.assignee;
  const view = firstValue(query.view);
  const activeView = view === "board" || view === "calendar" ? view : "list";

  const [tasks, members, savedViews] = await Promise.all([
    getTasksForProject(projectId, organization.id, { ...filters, assigneeId }),
    getProjectMembers(projectId),
    getSavedViews(organization.id, projectId, user.id),
  ]);

  const canCreate = can(role, "tasks:create");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-neutral-500">
            <Link href={`/dashboard/projects/${projectId}`} className="hover:text-neutral-700">
              {project.name}
            </Link>
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-neutral-900">Tasks</h1>
          <p className="mt-1 text-sm text-neutral-600">
            {tasks.length} task{tasks.length === 1 ? "" : "s"}.
          </p>
        </div>
        {canCreate && (
          <Link
            href={`/dashboard/projects/${projectId}/tasks/new`}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            New task
          </Link>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-xl border border-neutral-200 bg-white p-1">
            {(["list", "board", "calendar"] as const).map((item) => {
              const params = new URLSearchParams();
              for (const [key, value] of Object.entries(query)) if (typeof value === "string" && key !== "view") params.set(key, value);
              params.set("view", item);
              return <Link key={item} href={`/dashboard/projects/${projectId}/tasks?${params.toString()}`} className={`rounded-lg px-3 py-1.5 text-sm font-semibold capitalize ${activeView === item ? "bg-[#d92d27] text-white" : "text-neutral-500 hover:bg-neutral-50"}`}>{item === "board" ? "Kanban" : item}</Link>;
            })}
          </div>
          <SavedViews projectId={projectId} views={savedViews} current={{ view: activeView, filters: Object.fromEntries(Object.entries(query).filter(([key, value]) => key !== "view" && typeof value === "string")) as Record<string, string> }} />
        </div>
        <TaskFilters initialFilters={filters} members={members} />
      </div>

      {tasks.length === 0 ? (
        <EmptyState
          hasFilters={Boolean(filters.status || filters.priority || filters.assignee || filters.search)}
        />
      ) : (
        <div className={activeView === "board" ? "overflow-x-auto pb-2" : ""}>
          <TaskWorkspace projectId={projectId} tasks={tasks} view={activeView} canMove={can(role, "tasks:update")} />
        </div>
      )}
    </div>
  );
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="rounded-md border border-dashed border-neutral-300 py-16 text-center">
      <p className="text-sm text-neutral-600">
        {hasFilters ? "No tasks match these filters." : "No tasks yet. Create the first one to get started."}
      </p>
    </div>
  );
}
