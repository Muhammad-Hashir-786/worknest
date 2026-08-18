import type { Metadata } from "next";
import Link from "next/link";
import { readAllNotifications, readNotification } from "~/actions/notification";
import { requireOrgContext } from "~/lib/auth/current-org";
import { getNotificationsForUser } from "~/services/notification";
import PageHeader from "~/components/ui/page-header";

export const metadata: Metadata = { title: "Notifications - WorkNest" };
const icons: Record<string, string> = { task_assigned: "@", status_change: "↻", comment_mention: "…", deadline_reminder: "!", project_update: "↗", general: "•" };

export default async function NotificationsPage() {
  const { user, organization } = await requireOrgContext();
  const notifications = await getNotificationsForUser(user.id, organization.id);
  const unread = notifications.filter((item) => !item.read).length;
  return <div className="max-w-3xl space-y-7"><PageHeader eyebrow="Workspace updates" title="Notifications" description={unread ? `${unread} unread update${unread === 1 ? "" : "s"} need your attention.` : "You’re all caught up across your workspace."} action={unread > 0 && <form action={readAllNotifications}><button className="rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 transition hover:border-red-200 hover:text-[#b42318]">Mark all read</button></form>} /><div className="worknest-panel overflow-hidden rounded-2xl border border-neutral-200 bg-white">{notifications.length === 0 ? <div className="p-12 text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-xl text-emerald-600">✓</span><p className="mt-4 font-bold text-neutral-900">You’re all caught up</p><p className="mt-1 text-sm text-neutral-500">New assignments, comments, and status updates will appear here.</p></div> : <ul className="divide-y divide-neutral-100">{notifications.map((item) => { const href = item.relatedProjectId && item.relatedTaskId ? `/dashboard/projects/${item.relatedProjectId}/tasks/${item.relatedTaskId}` : item.relatedProjectId ? `/dashboard/projects/${item.relatedProjectId}` : "/dashboard"; return <li key={item.id} className={`p-4 transition hover:bg-neutral-50 sm:p-5 ${!item.read ? "bg-red-50/40" : ""}`}><div className="flex items-start gap-3"><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-bold ${item.read ? "bg-neutral-100 text-neutral-500" : "bg-red-100 text-[#d92d27]"}`}>{icons[item.type] ?? "•"}</span><div className="min-w-0 flex-1"><Link href={href} className="text-sm font-semibold text-neutral-800 hover:text-[#b42318]">{item.message}</Link><span className="mt-1 block text-xs text-neutral-400">{new Date(item.createdAt).toLocaleString()}</span></div>{!item.read && <form action={readNotification}><input type="hidden" name="notificationId" value={item.id}/><button className="shrink-0 text-xs font-semibold text-neutral-500 hover:text-[#b42318]">Mark read</button></form>}</div></li>; })}</ul>}</div><p className="text-center text-xs text-neutral-400">Manage these alerts in <Link href="/dashboard/settings/notifications" className="font-semibold text-[#d92d27] hover:underline">Alert preferences</Link>.</p></div>;
}
