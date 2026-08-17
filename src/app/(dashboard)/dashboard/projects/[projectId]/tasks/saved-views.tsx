"use client";
import { useActionState } from "react";
import Link from "next/link";
import { deleteSavedViewAction, saveViewAction, type PlanningActionState } from "~/actions/planning";
import type { SavedViewSummary } from "~/services/saved-view";
const initial: PlanningActionState = {};

export default function SavedViews({ projectId, views, current }: { projectId: string; views: SavedViewSummary[]; current: { view: string; filters: Record<string, string> } }) {
  const [state, action, pending] = useActionState(saveViewAction, initial);
  return <div className="flex flex-wrap items-center gap-2"><span className="text-xs font-bold uppercase tracking-wide text-neutral-400">Views</span>{views.map((saved) => <div key={saved.id} className="flex overflow-hidden rounded-lg border border-neutral-200 bg-white"><Link href={`/dashboard/projects/${projectId}/tasks?${new URLSearchParams({ ...saved.filters, view: saved.view })}`} className="px-2.5 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50">{saved.name}</Link><form action={deleteSavedViewAction}><input type="hidden" name="id" value={saved.id}/><input type="hidden" name="projectId" value={projectId}/><button aria-label={`Delete ${saved.name}`} className="border-l border-neutral-200 px-2 text-xs text-neutral-400 hover:bg-red-50 hover:text-red-600">×</button></form></div>)}<form action={action} className="flex items-center gap-1"><input type="hidden" name="projectId" value={projectId}/><input type="hidden" name="view" value={current.view}/><input type="hidden" name="filters" value={JSON.stringify(current.filters)}/><input required name="name" maxLength={80} placeholder="Save view as…" className="w-32 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs"/><button disabled={pending} className="rounded-lg bg-neutral-900 px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Save</button></form>{state.error && <span className="text-xs text-red-600">{state.error}</span>}</div>;
}
