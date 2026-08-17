import type { Metadata } from "next";
import Link from "next/link";
import { readAllNotifications, readNotification } from "~/actions/notification";
import { requireOrgContext } from "~/lib/auth/current-org";
import { getNotificationsForUser } from "~/services/notification";
export const metadata: Metadata = { title: "Notifications - WorkNest" };
export default async function NotificationsPage() {
  const { user, organization } = await requireOrgContext();
  const notifications = await getNotificationsForUser(user.id, organization.id);
  return <div className="max-w-3xl"><div className="flex items-center justify-between"><div><h1 className="text-2xl font-semibold text-neutral-900">Notifications</h1><p className="mt-1 text-sm text-neutral-600">Updates from your workspace.</p></div>{notifications.some((item) => !item.read) && <form action={readAllNotifications}><button className="text-sm font-medium text-neutral-700 underline">Mark all read</button></form>}</div>
    <div className="mt-6 overflow-hidden rounded-lg border border-neutral-200 bg-white">{notifications.length === 0 ? <p className="p-6 text-sm text-neutral-500">You’re all caught up.</p> : <ul className="divide-y divide-neutral-100">{notifications.map((item) => { const href = item.relatedProjectId && item.relatedTaskId ? `/dashboard/projects/${item.relatedProjectId}/tasks/${item.relatedTaskId}` : item.relatedProjectId ? `/dashboard/projects/${item.relatedProjectId}` : "/dashboard"; return <li key={item.id} className={item.read ? "p-4" : "bg-blue-50 p-4"}><div className="flex items-start justify-between gap-4"><Link href={href} className="text-sm text-neutral-800 hover:underline">{item.message}<span className="mt-1 block text-xs text-neutral-400">{new Date(item.createdAt).toLocaleString()}</span></Link>{!item.read && <form action={readNotification}><input type="hidden" name="notificationId" value={item.id}/><button className="text-xs font-medium text-neutral-600">Mark read</button></form>}</div></li>})}</ul>}</div></div>;
}
