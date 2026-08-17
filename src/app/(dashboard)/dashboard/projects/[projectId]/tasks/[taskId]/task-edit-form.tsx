"use client";

import { useActionState } from "react";
import { updateTask, type TaskActionState } from "~/actions/task";
import { TASK_STATUS, PRIORITY } from "~/lib/constants/roles";
import { RECURRENCE_OPTIONS } from "~/lib/validations/task";
import type { TaskDetail } from "~/services/task";
import type { ProjectMemberSummary } from "~/services/project";

const initialState: TaskActionState = {};

export default function TaskEditForm({
  projectId,
  task,
  members,
  canEdit,
  canReassign,
  availableDependencies,
}: {
  projectId: string;
  task: TaskDetail;
  members: ProjectMemberSummary[];
  canEdit: boolean;
  canReassign: boolean;
  availableDependencies: { id: string; title: string }[];
}) {
  const [state, formAction, pending] = useActionState(updateTask, initialState);

  const fieldClass =
    "mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none disabled:bg-neutral-100 disabled:text-neutral-500";

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="taskId" value={task.id} />
      <input type="hidden" name="projectId" value={projectId} />

      <div>
        <label htmlFor="title" className="block text-sm font-medium text-neutral-700">
          Title
        </label>
        <input
          id="title"
          name="title"
          type="text"
          defaultValue={task.title}
          required
          disabled={!canEdit}
          className={fieldClass}
        />
        {state.fieldErrors?.title && <p className="mt-1 text-sm text-red-600">{state.fieldErrors.title}</p>}
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-neutral-700">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={task.description}
          disabled={!canEdit}
          className={fieldClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-neutral-700">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={task.status}
            disabled={!canEdit}
            className={fieldClass}
          >
            {TASK_STATUS.map((status) => (
              <option key={status} value={status}>
                {status.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="priority" className="block text-sm font-medium text-neutral-700">
            Priority
          </label>
          <select
            id="priority"
            name="priority"
            defaultValue={task.priority}
            disabled={!canEdit}
            className={fieldClass}
          >
            {PRIORITY.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="recurrence" className="block text-sm font-medium text-neutral-700">Repeat</label>
          <select id="recurrence" name="recurrence" defaultValue={task.recurrence} disabled={!canEdit} className={fieldClass}>
            {RECURRENCE_OPTIONS.map((value) => <option key={value} value={value}>{value === "none" ? "Does not repeat" : `Every ${value}`}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="recurrenceEndDate" className="block text-sm font-medium text-neutral-700">Repeat until</label>
          <input id="recurrenceEndDate" name="recurrenceEndDate" type="date" defaultValue={task.recurrenceEndDate ? new Date(task.recurrenceEndDate).toISOString().slice(0, 10) : ""} disabled={!canEdit} className={fieldClass}/>
        </div>
      </div>

      <div>
        <label htmlFor="dependsOn" className="block text-sm font-medium text-neutral-700">Blocked by</label>
        <select id="dependsOn" name="dependsOn" multiple defaultValue={task.dependsOn.map((dependency) => dependency.id)} disabled={!canEdit} className={`${fieldClass} min-h-28`}>
          {availableDependencies.map((dependency) => <option key={dependency.id} value={dependency.id}>{dependency.title}</option>)}
        </select>
        <p className="mt-1 text-xs text-neutral-500">Select tasks that must finish first. Hold Ctrl/Cmd to select multiple.</p>
        {state.fieldErrors?.dependsOn && <p className="mt-1 text-sm text-red-600">{state.fieldErrors.dependsOn}</p>}
      </div>

      <div>
        <label htmlFor="assignee" className="block text-sm font-medium text-neutral-700">
          Assignee
        </label>
        {canReassign ? (
          <select
            id="assignee"
            name="assignee"
            defaultValue={task.assignee?.id ?? ""}
            disabled={!canEdit}
            className={fieldClass}
          >
            <option value="">Unassigned</option>
            {members.map((member) => (
              <option key={member.user.id} value={member.user.id}>
                {member.user.name}
              </option>
            ))}
          </select>
        ) : (
          // Members can't reassign a task (see updateTask in actions/task.ts) -
          // shown read-only instead of a disabled <select> so it's clear this
          // isn't just temporarily locked, it's simply not their call to make.
          <p className="mt-1 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-600">
            {task.assignee?.name ?? "Unassigned"}
          </p>
        )}
        {state.fieldErrors?.assignee && (
          <p className="mt-1 text-sm text-red-600">{state.fieldErrors.assignee}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="dueDate" className="block text-sm font-medium text-neutral-700">
            Due date
          </label>
          <input
            id="dueDate"
            name="dueDate"
            type="date"
            defaultValue={task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : ""}
            disabled={!canEdit}
            className={fieldClass}
          />
        </div>

        <div>
          <label htmlFor="estimatedHours" className="block text-sm font-medium text-neutral-700">
            Estimated hours
          </label>
          <input
            id="estimatedHours"
            name="estimatedHours"
            type="number"
            min="0"
            step="0.5"
            defaultValue={task.estimatedHours ?? ""}
            disabled={!canEdit}
            className={fieldClass}
          />
        </div>
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-green-600">Saved.</p>}

      {canEdit && (
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {pending ? "Saving..." : "Save changes"}
        </button>
      )}
    </form>
  );
}
