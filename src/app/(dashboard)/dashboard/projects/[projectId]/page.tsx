import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOrgContext } from "~/lib/auth/current-org";
import { can } from "~/lib/permissions/permissions";
import { getProjectForOrg, getProjectMembers, getAddableOrgMembers } from "~/services/project";
import { getClientsForOrg } from "~/services/client";
import { getTasksForProject } from "~/services/task";
import { getMilestones } from "~/services/milestone";
import { getInvoices, getProjectFinance } from "~/services/finance";
import { getProjectActivity } from "~/services/activity";
import { getAttachmentsForProject } from "~/services/attachment";
import ProjectEditForm from "./project-edit-form";
import ProjectMembers from "./project-members";
import DeleteProjectForm from "./delete-project-form";
import Milestones from "./milestones";
import FinancePanel from "./finance-panel";
import ActivityTimeline from "./activity-timeline";

export async function generateMetadata({ params }: { params: Promise<{ projectId: string }> }): Promise<Metadata> { const { projectId } = await params; return { title: `Project ${projectId} - WorkNest` }; }

const tabs = ["overview", "tasks", "timeline", "files", "finance", "activity"] as const;
type Tab = typeof tabs[number];
const tabLabels: Record<Tab, string> = { overview: "Overview", tasks: "Tasks", timeline: "Timeline", files: "Files", finance: "Finance", activity: "Activity" };

export default async function ProjectDetailPage({ params, searchParams }: { params: Promise<{ projectId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { projectId } = await params;
  const query = await searchParams;
  const requestedTab = Array.isArray(query.tab) ? query.tab[0] : query.tab;
  const activeTab: Tab = tabs.includes(requestedTab as Tab) ? requestedTab as Tab : "overview";
  const { organization, role } = await requireOrgContext();
  const project = await getProjectForOrg(projectId, organization.id);
  if (!project) notFound();
  const canEdit = can(role, "projects:update");
  const canDelete = can(role, "projects:delete");
  const canManageMembers = can(role, "projects:manageMembers");
  const [clients, members, addableMembers, tasks, milestones, finance, invoices, timeline, attachments] = await Promise.all([
    getClientsForOrg(organization.id), getProjectMembers(projectId), canManageMembers ? getAddableOrgMembers(projectId, organization.id) : Promise.resolve([]),
    getTasksForProject(projectId, organization.id), getMilestones(projectId, organization.id), getProjectFinance(projectId, organization.id), getInvoices(projectId, organization.id),
    getProjectActivity(projectId, organization.id), getAttachmentsForProject(projectId, organization.id),
  ]);
  const completedTasks = tasks.filter((task) => task.status === "completed").length;
  const overdueTasks = tasks.filter((task) => task.isOverdue).length;
  const progress = tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 0;
  const estimatedHours = tasks.reduce((total, task) => total + task.estimatedHours, 0);
  const estimatedSpend = estimatedHours * (finance?.hourlyRate ?? 0);
  const budgetUsage = finance?.budget ? Math.round((estimatedSpend / finance.budget) * 100) : 0;
  const workloadByMember = tasks.filter((task) => task.status !== "completed" && task.assignee).reduce<Record<string, number>>((result, task) => { const id = task.assignee!.id; result[id] = (result[id] ?? 0) + 1; return result; }, {});
  const busiestMemberTasks = Math.max(0, ...Object.values(workloadByMember));
  const workloadRisk = busiestMemberTasks >= 8 || (members.length > 0 && tasks.filter((task) => task.status !== "completed").length > members.length * 6);
  const deadlinePassed = project.isOverdue;
  const health = deadlinePassed || overdueTasks > 0 ? { label: "Overdue", tone: "bg-red-50 text-[#b42318]", detail: `${overdueTasks} overdue task${overdueTasks === 1 ? "" : "s"}` } : budgetUsage >= 85 || workloadRisk ? { label: "At risk", tone: "bg-amber-50 text-amber-700", detail: workloadRisk ? `${busiestMemberTasks} open tasks on busiest member` : `${budgetUsage}% of budget planned` } : { label: "On track", tone: "bg-emerald-50 text-emerald-700", detail: "Delivery is moving well" };

  return <div className="space-y-7">
    <section className="overflow-hidden rounded-3xl bg-[#171717] text-white shadow-xl shadow-neutral-900/10"><div className="p-6 sm:p-8"><div className="flex flex-wrap items-start justify-between gap-5"><div><p className="text-sm text-neutral-400">{project.client.name} · {project.priority} priority</p><h1 className="mt-2 text-3xl font-bold tracking-tight">{project.name}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-400">{project.description}</p></div><span className={`rounded-full px-3 py-1.5 text-xs font-bold ${health.tone}`}>{health.label}</span></div><div className="mt-8 grid gap-5 sm:grid-cols-4"><div><p className="text-xs uppercase tracking-wide text-neutral-500">Progress</p><p className="mt-1 text-2xl font-bold">{progress}%</p></div><div><p className="text-xs uppercase tracking-wide text-neutral-500">Tasks</p><p className="mt-1 text-2xl font-bold">{completedTasks}<span className="text-base text-neutral-500">/{tasks.length}</span></p></div><div><p className="text-xs uppercase tracking-wide text-neutral-500">Deadline</p><p className="mt-1 text-lg font-bold">{new Date(project.deadline).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</p></div><div><p className="text-xs uppercase tracking-wide text-neutral-500">Health</p><p className="mt-1 text-sm font-semibold text-neutral-200">{health.detail}</p></div></div><div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10"><div className={`h-full rounded-full ${health.label === "Overdue" ? "bg-[#d92d27]" : "bg-emerald-400"}`} style={{ width: `${progress}%` }} /></div></div></section>
    <nav className="flex gap-1 overflow-x-auto rounded-2xl border border-neutral-200 bg-white p-1.5" aria-label="Project sections">{tabs.map((tab) => <Link key={tab} href={tab === "tasks" ? `/dashboard/projects/${projectId}/tasks` : `/dashboard/projects/${projectId}?tab=${tab}`} className={`shrink-0 rounded-xl px-3.5 py-2 text-sm font-semibold transition ${activeTab === tab ? "bg-[#d92d27] text-white shadow-sm" : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-800"}`}>{tabLabels[tab]}{tab === "tasks" && <span className={`ml-1.5 text-xs ${activeTab === tab ? "text-red-100" : "text-neutral-400"}`}>{tasks.length}</span>}</Link>)}</nav>

    {activeTab === "overview" && <div className="space-y-8"><Milestones projectId={projectId} milestones={milestones} canManage={canEdit} /><section className="grid gap-6 lg:grid-cols-2"><div><h2 className="text-sm font-medium text-neutral-900">Project details</h2><div className="mt-2"><ProjectEditForm project={project} clients={clients} canEdit={canEdit} /></div></div><div><h2 className="text-sm font-medium text-neutral-900">Members</h2><div className="mt-2"><ProjectMembers projectId={project.id} members={members} addableMembers={addableMembers} canManage={canManageMembers} /></div></div></section></div>}
    {activeTab === "timeline" && <section className="space-y-5"><div className="rounded-2xl border border-neutral-200 bg-white p-5"><p className="text-sm text-neutral-500">A visual schedule for milestones and delivery deadlines.</p><div className="mt-5 space-y-3">{milestones.length === 0 ? <p className="text-sm text-neutral-400">Add milestones to build your project timeline.</p> : milestones.map((milestone) => <div key={milestone.id} className="flex items-center gap-3"><span className={`h-3 w-3 rounded-full ${milestone.completed ? "bg-emerald-500" : "bg-[#d92d27]"}`} /><div className="h-px w-8 bg-neutral-200" /><span className="flex-1 text-sm font-medium text-neutral-800">{milestone.title}</span><time className="text-xs text-neutral-400">{new Date(milestone.dueDate).toLocaleDateString()}</time></div>)}</div></div></section>}
    {activeTab === "files" && <section className="worknest-panel rounded-2xl border border-neutral-200 bg-white p-6"><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#d92d27]">Project files</p><h2 className="mt-1 font-bold text-neutral-900">Shared attachments</h2>{attachments.length === 0 ? <p className="mt-5 rounded-xl bg-neutral-50 p-5 text-sm text-neutral-500">Files attached to project tasks will appear here.</p> : <div className="mt-5 divide-y divide-neutral-100">{attachments.map((file) => <a key={file.id} href={`/api/attachments/${file.id}/download`} className="flex items-center gap-3 py-3 hover:bg-neutral-50"><span className="grid h-9 w-9 place-items-center rounded-xl bg-red-50 text-sm text-[#d92d27]">↗</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-neutral-800">{file.name}</span><span className="block text-xs text-neutral-400">{file.taskTitle} · {file.uploadedBy?.name ?? "Unknown"}</span></span><span className="text-xs text-neutral-400">{Math.round(file.size / 1024)} KB</span></a>)}</div>}</section>}
    {activeTab === "finance" && <section><FinancePanel projectId={projectId} finance={finance} invoices={invoices} canManage={canEdit} /><div className="mt-5 grid gap-4 sm:grid-cols-3"><Metric label="Budget" value={finance?.budget ? `$${finance.budget.toLocaleString()}` : "Not set"} /><Metric label="Planned spend" value={`$${estimatedSpend.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} /><Metric label="Budget usage" value={finance?.budget ? `${budgetUsage}%` : "—"} /></div></section>}
    {activeTab === "activity" && <ActivityTimeline entries={timeline} />}
    {activeTab === "tasks" && <section className="rounded-2xl border border-neutral-200 bg-white p-8 text-center"><p className="text-sm text-neutral-500">Tasks have their own focused workspace with list, Kanban, and calendar views.</p><Link href={`/dashboard/projects/${projectId}/tasks`} className="mt-4 inline-flex rounded-xl bg-[#d92d27] px-4 py-2.5 text-sm font-bold text-white">Open task workspace →</Link></section>}

    {canDelete && activeTab === "overview" && <section className="border-t border-neutral-200 pt-6"><h2 className="text-sm font-medium text-red-600">Danger zone</h2><p className="mt-1 text-sm text-neutral-600">Deleting a project permanently removes it and its membership records.</p><div className="mt-2"><DeleteProjectForm projectId={project.id} projectName={project.name} /></div></section>}
  </div>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-neutral-200 bg-white p-4"><p className="text-xs uppercase tracking-wide text-neutral-400">{label}</p><p className="mt-2 text-xl font-bold text-neutral-900">{value}</p></div>; }
