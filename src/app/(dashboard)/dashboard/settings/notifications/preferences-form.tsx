"use client";

import { useActionState } from "react";
import { saveNotificationPreferencesAction } from "~/actions/notification-preferences";
import type { NotificationPreferences } from "~/services/notification-preferences";

const initial = { success: false };
const options = [
  ["taskAssignments", "Task assignments", "When someone assigns a task to you."],
  ["statusChanges", "Task status changes", "When a task you own moves through the workflow."],
  ["comments", "Comments and mentions", "When a teammate comments or mentions you."],
  ["deadlines", "Deadline reminders", "When upcoming or overdue work needs attention."],
] as const;

export default function NotificationPreferencesForm({ preferences }: { preferences: NotificationPreferences }) {
  const [state, action, pending] = useActionState(saveNotificationPreferencesAction, initial);
  return <form action={action} className="worknest-panel overflow-hidden rounded-2xl border border-neutral-200 bg-white"><div className="divide-y divide-neutral-100">{options.map(([name, title, description]) => <label key={name} className="flex cursor-pointer items-center gap-4 p-5 transition hover:bg-neutral-50"><input type="checkbox" name={name} defaultChecked={preferences[name]} className="h-5 w-5 rounded border-neutral-300 text-[#d92d27] focus:ring-[#d92d27]" /><span className="flex-1"><span className="block text-sm font-bold text-neutral-900">{title}</span><span className="mt-1 block text-sm text-neutral-500">{description}</span></span><span className="text-xs font-semibold text-neutral-300">IN-APP</span></label>)}<label className="flex cursor-pointer items-center gap-4 bg-neutral-50/70 p-5"><input type="checkbox" name="emailUpdates" defaultChecked={preferences.emailUpdates} className="h-5 w-5 rounded border-neutral-300 text-[#d92d27] focus:ring-[#d92d27]" /><span className="flex-1"><span className="block text-sm font-bold text-neutral-900">Email updates</span><span className="mt-1 block text-sm text-neutral-500">Allow future email delivery for important workspace events.</span></span><span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">Provider required</span></label></div><div className="flex items-center justify-between border-t border-neutral-100 p-5"><span className="text-sm text-emerald-600">{state.success ? "Preferences saved." : ""}</span><button disabled={pending} className="rounded-xl bg-[#d92d27] px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-red-100 disabled:opacity-50">{pending ? "Saving…" : "Save preferences"}</button></div></form>;
}
