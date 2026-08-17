import type { Metadata } from "next";
import Link from "next/link";
import { requireOrgContext } from "~/lib/auth/current-org";
import { getDashboardData } from "~/services/dashboard";
import { getRecentActivity } from "~/services/activity";
import PageHeader from "~/components/ui/page-header";
import StatCard from "~/components/ui/stat-card";
import StatusBadge from "~/components/ui/status-badge";

export const metadata: Metadata = { title: "Dashboard - WorkNest" };

export default async function DashboardPage() {
  const { user, organization } = await requireOrgContext();
  const [data, activity] = await Promise.all([getDashboardData(organization.id), getRecentActivity(organization.id, 8)]);

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Today at WorkNest" title={`Welcome back, ${user.name.split(" ")[0]}`} description={<>Here’s a live view of <strong className="font-semibold text-neutral-800">{organization.name}</strong>.</>} action={<div className="flex gap-2"><Link href="/dashboard/projects" className="rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 transition hover:border-neutral-300 hover:bg-neutral-50">View projects</Link><Link href="/dashboard/projects/new" className="rounded-xl bg-[#d92d27] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-200 transition hover:-translate-y-0.5 hover:bg-[#b42318]">+ New project</Link></div>} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[['Projects', data.totalProjects], ['Active projects', data.activeProjects], ['Tasks', data.totalTasks], ['Completed tasks', data.completedTasks], ['Overdue tasks', data.overdueTasks], ['Team members', data.memberCount]].map(([label, value], index) => <StatCard key={String(label)} label={String(label)} value={Number(value)} accent={index === 4 && Number(value) > 0} />)}
      </div>
      <div className="grid gap-6 lg:grid-cols-2"><section className="worknest-panel rounded-2xl border border-neutral-200 bg-white p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#d92d27]">Progress</p><h2 className="mt-1 font-bold text-neutral-900">Task distribution</h2></div><Link href="/dashboard/projects" className="text-sm font-semibold text-[#d92d27]">View projects</Link></div><div className="mt-5 space-y-3">{data.taskDistribution.length === 0 ? <p className="text-sm text-neutral-500">No tasks yet. <Link className="font-medium text-[#d92d27] underline" href="/dashboard/projects">Create a project</Link> to begin.</p> : data.taskDistribution.map((item) => <div key={item.status} className="flex items-center justify-between rounded-xl bg-neutral-50 px-3 py-2"><StatusBadge value={item.status}/><span className="text-sm font-bold text-neutral-900">{item.count}</span></div>)}</div></section><section className="worknest-panel rounded-2xl border border-neutral-200 bg-white p-6"><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#d92d27]">Team pulse</p><h2 className="mt-1 font-bold text-neutral-900">Recent activity</h2><div className="mt-5 space-y-4">{activity.length === 0 ? <p className="text-sm text-neutral-500">Activity will appear as your team works.</p> : activity.map((item) => <div key={item.id} className="border-l-2 border-red-100 pl-3 text-sm text-neutral-600"><span className="font-semibold text-neutral-900">{item.user.name}</span> {item.action.replace('_', ' ')} a {item.entityType.toLowerCase()}<span className="mt-1 block text-xs text-neutral-400">{new Date(item.createdAt).toLocaleString()}</span></div>)}</div></section></div>
    </div>
  );
}
