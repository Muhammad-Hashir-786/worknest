"use client";

import { useActionState } from "react";
import { startTimer, stopTimer, type TimeEntryActionState } from "~/actions/time-entry";
import type { TimeEntrySummary } from "~/services/time-entry";

const initialState: TimeEntryActionState = {};
function formatDuration(seconds: number | null) {
  if (seconds === null) return "Running";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

export default function TimeTracking({ taskId, projectId, entries, currentUserId, canTrack }: {
  taskId: string; projectId: string; entries: TimeEntrySummary[]; currentUserId: string; canTrack: boolean;
}) {
  const running = entries.find((entry) => entry.userId === currentUserId && entry.endedAt === null);
  const [startState, startAction, startPending] = useActionState(startTimer, initialState);
  const [stopState, stopAction, stopPending] = useActionState(stopTimer, initialState);
  return <div className="rounded-lg border border-neutral-200 bg-white p-4">
    {canTrack && (running ? <form action={stopAction}><input type="hidden" name="taskId" value={taskId}/><input type="hidden" name="projectId" value={projectId}/><input type="hidden" name="entryId" value={running.id}/><button disabled={stopPending} className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">{stopPending ? "Stopping..." : "Stop timer"}</button></form> : <form action={startAction}><input type="hidden" name="taskId" value={taskId}/><input type="hidden" name="projectId" value={projectId}/><button disabled={startPending} className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">{startPending ? "Starting..." : "Start timer"}</button></form>)}
    {(startState.error || stopState.error) && <p className="mt-2 text-sm text-red-600">{startState.error ?? stopState.error}</p>}
    {entries.length === 0 ? <p className="mt-3 text-sm text-neutral-500">No time recorded yet.</p> : <ul className="mt-3 divide-y divide-neutral-100 text-sm">{entries.map((entry) => <li key={entry.id} className="flex justify-between py-2 text-neutral-600"><span>{new Date(entry.startedAt).toLocaleString()}</span><span className="font-medium text-neutral-900">{formatDuration(entry.duration)}</span></li>)}</ul>}
  </div>;
}
