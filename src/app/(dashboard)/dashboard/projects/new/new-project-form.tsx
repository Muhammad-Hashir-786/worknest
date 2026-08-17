"use client";

import { useActionState, useState } from "react";
import { createProject, type ProjectActionState } from "~/actions/project";
import { PRIORITY } from "~/lib/constants/roles";
import { NEW_CLIENT_VALUE } from "~/lib/validations/project";
import type { ClientOption } from "~/services/client";

const initialState: ProjectActionState = {};

export default function NewProjectForm({ clients }: { clients: ClientOption[] }) {
  const [state, formAction, pending] = useActionState(createProject, initialState);
  const [clientId, setClientId] = useState(clients.length > 0 ? clients[0].id : NEW_CLIENT_VALUE);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-neutral-700">
          Project name
        </label>
        <input
          id="name"
          name="name"
          type="text"
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
          required
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
          <label htmlFor="startDate" className="block text-sm font-medium text-neutral-700">
            Start date
          </label>
          <input
            id="startDate"
            name="startDate"
            type="date"
            required
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          />
          {state.fieldErrors?.startDate && (
            <p className="mt-1 text-sm text-red-600">{state.fieldErrors.startDate}</p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="deadline" className="block text-sm font-medium text-neutral-700">
          Deadline
        </label>
        <input
          id="deadline"
          name="deadline"
          type="date"
          required
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
        />
        {state.fieldErrors?.deadline && (
          <p className="mt-1 text-sm text-red-600">{state.fieldErrors.deadline}</p>
        )}
      </div>

      <div>
        <label htmlFor="clientId" className="block text-sm font-medium text-neutral-700">
          Client
        </label>
        <select
          id="clientId"
          name="clientId"
          value={clientId}
          onChange={(event) => setClientId(event.target.value)}
          className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
        >
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
              {client.company ? ` (${client.company})` : ""}
            </option>
          ))}
          <option value={NEW_CLIENT_VALUE}>+ New client...</option>
        </select>
        {state.fieldErrors?.clientId && (
          <p className="mt-1 text-sm text-red-600">{state.fieldErrors.clientId}</p>
        )}
      </div>

      {clientId === NEW_CLIENT_VALUE && (
        <div className="space-y-3 rounded-md border border-neutral-200 bg-neutral-50 p-3">
          <p className="text-xs font-medium text-neutral-500">New client details</p>
          <div>
            <input
              name="newClientName"
              type="text"
              placeholder="Client name"
              required
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
            />
            {state.fieldErrors?.newClientName && (
              <p className="mt-1 text-sm text-red-600">{state.fieldErrors.newClientName}</p>
            )}
          </div>
          <input
            name="newClientCompany"
            type="text"
            placeholder="Company (optional)"
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          />
          <div>
            <input
              name="newClientEmail"
              type="email"
              placeholder="Email (optional)"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
            />
            {state.fieldErrors?.newClientEmail && (
              <p className="mt-1 text-sm text-red-600">{state.fieldErrors.newClientEmail}</p>
            )}
          </div>
        </div>
      )}

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {pending ? "Creating..." : "Create project"}
      </button>
    </form>
  );
}
