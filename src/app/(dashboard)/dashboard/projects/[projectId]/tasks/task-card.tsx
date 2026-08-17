"use client";

import Link from "next/link";
import Image from "next/image";
import { useActionState } from "react";
import { changeTaskStatus, type TaskActionState } from "~/actions/task";
import { TASK_STATUS } from "~/lib/constants/roles";
import type { TaskSummary } from "~/services/task";

const PRIORITY_STYLES: Record<string, string> = {
  high: "text-red-600",
  medium: "text-amber-600",
  low: "text-neutral-500",
};

const STATUS_SELECT_STYLES: Record<string, string> = {
  todo: "bg-neutral-100 text-neutral-700",
  in_progress: "bg-blue-100 text-blue-700",
  in_review: "bg-amber-100 text-amber-700",
  completed: "bg-green-100 text-green-700",
};

const initialState: TaskActionState = {};

export default function TaskCard({
  projectId,
  task,
}: {
  projectId: string;
  task: TaskSummary;
}) {
  const [state, formAction] = useActionState(changeTaskStatus, initialState);

  return (
    <div className="flex items-center gap-4 px-4 py-3">
      <Link href={`/dashboard/projects/${projectId}/tasks/${task.id}`} className="min-w-0 flex-1">
        <p className="truncate font-medium text-neutral-900 hover:underline">{task.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
          <span className={`font-medium ${PRIORITY_STYLES[task.priority]}`}>{task.priority}</span>
          {task.dueDate && (
            <span className={task.isOverdue ? "font-medium text-red-600" : ""}>
              Due {new Date(task.dueDate).toLocaleDateString()}
            </span>
          )}
          {task.subtaskTotal > 0 && (
            <span>
              {task.subtaskCompleted}/{task.subtaskTotal} subtasks
            </span>
          )}
        </div>
      </Link>

      {task.assignee ? (
        <div className="flex shrink-0 items-center gap-2" title={task.assignee.name}>
          <Image
            src={task.assignee.avatar}
            alt=""
            width={24}
            height={24}
            className="h-6 w-6 rounded-full object-cover"
          />
        </div>
      ) : (
        <span className="shrink-0 text-xs text-neutral-400">Unassigned</span>
      )}

      <form action={formAction} className="shrink-0">
        <input type="hidden" name="taskId" value={task.id} />
        <input type="hidden" name="projectId" value={projectId} />
        <select
          name="status"
          defaultValue={task.status}
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
          className={`rounded-full border-0 px-2 py-1 text-xs font-medium focus:outline-none ${STATUS_SELECT_STYLES[task.status]}`}
        >
          {TASK_STATUS.map((status) => (
            <option key={status} value={status}>
              {status.replace("_", " ")}
            </option>
          ))}
        </select>
        {state.error && <p className="mt-1 text-xs text-red-600">{state.error}</p>}
      </form>
    </div>
  );
}
