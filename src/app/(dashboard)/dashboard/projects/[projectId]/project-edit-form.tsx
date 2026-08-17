"use client";

import { useActionState } from "react";
import { updateProject, type ProjectActionState } from "~/actions/project";
import { PROJECT_STATUS, PRIORITY } from "~/lib/constants/roles";
import type { ProjectDetail } from "~/services/project";
import type { ClientOption } from "~/services/client";

const initialState: ProjectActionState = {};

function toDateInputValue(date: Date): string {
  return new Date(date).toISOString().slice(0, 10);
}

export default function ProjectEditForm({
  project,
  clients,
  canEdit,
}: {
  project: ProjectDetail;
  clients: ClientOption[];
  canEdit: boolean;
}) {
  const [state, formAction, pending] = useActionState(updateProject, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="projectId" value={project.id} />

      <fieldset disabled={!canEdit} className="space-y-4 disabled:opacity-60">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-neutral-700">
            Project name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            defaultValue={project.name}
            required
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          />
          {state.fieldErrors?.name && <p className="mt-1 text-sm text-red-600">{state.fieldErrors.name}</p>}
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-neutral-700">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            defaultValue={project.description}
            required
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          />
          {state.fieldErrors?.description && (
            <p className="mt-1 text-sm text-red-600">{state.fieldErrors.description}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-neutral-700">
              Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue={project.status}
              className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
            >
              {PROJECT_STATUS.map((status) => (
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
              defaultValue={project.priority}
              className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
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
            <label htmlFor="startDate" className="block text-sm font-medium text-neutral-700">
              Start date
            </label>
            <input
              id="startDate"
              name="startDate"
              type="date"
              defaultValue={toDateInputValue(project.startDate)}
              required
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
            />
            {state.fieldErrors?.startDate && (
              <p className="mt-1 text-sm text-red-600">{state.fieldErrors.startDate}</p>
            )}
          </div>

          <div>
            <label htmlFor="deadline" className="block text-sm font-medium text-neutral-700">
              Deadline
            </label>
            <input
              id="deadline"
              name="deadline"
              type="date"
              defaultValue={toDateInputValue(project.deadline)}
              required
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
            />
            {state.fieldErrors?.deadline && (
              <p className="mt-1 text-sm text-red-600">{state.fieldErrors.deadline}</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="clientId" className="block text-sm font-medium text-neutral-700">
            Client
          </label>
          <select
            id="clientId"
            name="clientId"
            defaultValue={project.client.id}
            className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          >
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
                {client.company ? ` (${client.company})` : ""}
              </option>
            ))}
          </select>
          {state.fieldErrors?.clientId && (
            <p className="mt-1 text-sm text-red-600">{state.fieldErrors.clientId}</p>
          )}
        </div>
      </fieldset>

      {!canEdit && <p className="text-sm text-neutral-500">You don&apos;t have permission to edit this project.</p>}
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
