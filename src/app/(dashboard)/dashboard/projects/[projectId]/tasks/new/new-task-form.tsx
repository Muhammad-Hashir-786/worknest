"use client";

import { useActionState, useRef } from "react";
import { createTask, type TaskActionState } from "~/actions/task";
import { PRIORITY } from "~/lib/constants/roles";
import { RECURRENCE_OPTIONS } from "~/lib/validations/task";
import type { ProjectMemberSummary } from "~/services/project";
import type { TaskTemplateSummary } from "~/services/task-template";

const initialState: TaskActionState = {};

export default function NewTaskForm({
  projectId,
  members,
  templates,
}: {
  projectId: string;
  members: ProjectMemberSummary[];
  templates: TaskTemplateSummary[];
}) {
  const [state, formAction, pending] = useActionState(createTask, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  function applyTemplate(id: string) {
    const template = templates.find((item) => item.id === id);
    const form = formRef.current;
    if (!template || !form) return;
    const set = (name: string, value: string) => { const element = form.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null; if (element) element.value = value; };
    set("title", template.title); set("description", template.description); set("priority", template.priority); set("estimatedHours", template.estimatedHours?.toString() ?? ""); set("recurrence", template.recurrence);
  }

  return (
    <form ref={formRef} data-task-form action={formAction} className="space-y-4">
      <input type="hidden" name="projectId" value={projectId} />

      {templates.length > 0 && <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-3"><label htmlFor="template" className="block text-sm font-semibold text-neutral-700">Start from a template</label><select id="template" defaultValue="" onChange={(event) => applyTemplate(event.target.value)} className="mt-2 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"><option value="">Choose a saved task template…</option>{templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select></div>}

      <div>
        <label htmlFor="title" className="block text-sm font-medium text-neutral-700">
          Title
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
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
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
        />
        {state.fieldErrors?.description && (
          <p className="mt-1 text-sm text-red-600">{state.fieldErrors.description}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="priority" className="block text-sm font-medium text-neutral-700">
            Priority
          </label>
          <select
            id="priority"
            name="priority"
            defaultValue="medium"
            className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          >
            {PRIORITY.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="assignee" className="block text-sm font-medium text-neutral-700">
            Assignee
          </label>
          <select
            id="assignee"
            name="assignee"
            defaultValue=""
            className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          >
            <option value="">Unassigned</option>
            {members.map((member) => (
              <option key={member.user.id} value={member.user.id}>
                {member.user.name}
              </option>
            ))}
          </select>
          {state.fieldErrors?.assignee && (
            <p className="mt-1 text-sm text-red-600">{state.fieldErrors.assignee}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="recurrence" className="block text-sm font-medium text-neutral-700">Repeat</label>
          <select id="recurrence" name="recurrence" defaultValue="none" className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm">
            {RECURRENCE_OPTIONS.map((value) => <option key={value} value={value}>{value === "none" ? "Does not repeat" : `Every ${value}`}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="recurrenceEndDate" className="block text-sm font-medium text-neutral-700">Repeat until</label>
          <input id="recurrenceEndDate" name="recurrenceEndDate" type="date" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"/>
        </div>
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
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          />
          {state.fieldErrors?.dueDate && <p className="mt-1 text-sm text-red-600">{state.fieldErrors.dueDate}</p>}
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
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          />
          {state.fieldErrors?.estimatedHours && (
            <p className="mt-1 text-sm text-red-600">{state.fieldErrors.estimatedHours}</p>
          )}
        </div>
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {pending ? "Creating..." : "Create task"}
      </button>
    </form>
  );
}
