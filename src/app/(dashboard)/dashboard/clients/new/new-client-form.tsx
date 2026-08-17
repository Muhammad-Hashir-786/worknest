"use client";

import { useActionState } from "react";
import { createClient, type ClientActionState } from "~/actions/client";

const initialState: ClientActionState = {};

export default function NewClientForm() {
  const [state, formAction, pending] = useActionState(createClient, initialState);

  return (
    <form action={formAction} className="space-y-4 rounded-lg border border-neutral-200 bg-white p-6">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-neutral-700">
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          placeholder="Jane Cooper"
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
        />
        {state.fieldErrors?.name && <p className="mt-1 text-sm text-red-600">{state.fieldErrors.name}</p>}
      </div>

      <div>
        <label htmlFor="company" className="block text-sm font-medium text-neutral-700">
          Company
        </label>
        <input
          id="company"
          name="company"
          type="text"
          placeholder="Acme Inc."
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
        />
        {state.fieldErrors?.company && (
          <p className="mt-1 text-sm text-red-600">{state.fieldErrors.company}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-neutral-700">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="jane@acme.com"
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          />
          {state.fieldErrors?.email && (
            <p className="mt-1 text-sm text-red-600">{state.fieldErrors.email}</p>
          )}
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-neutral-700">
            Phone
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            placeholder="(555) 123-4567"
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          />
          {state.fieldErrors?.phone && (
            <p className="mt-1 text-sm text-red-600">{state.fieldErrors.phone}</p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-neutral-700">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          placeholder="Anything worth remembering about this client..."
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
        />
        {state.fieldErrors?.notes && (
          <p className="mt-1 text-sm text-red-600">{state.fieldErrors.notes}</p>
        )}
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {pending ? "Creating..." : "Create client"}
      </button>
    </form>
  );
}
