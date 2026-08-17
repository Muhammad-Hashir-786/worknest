"use client";

import { deleteClient } from "~/actions/client";

export default function DeleteClientForm({
  clientId,
  clientName,
  disabled,
}: {
  clientId: string;
  clientName: string;
  disabled: boolean;
}) {
  function confirmDelete(event: React.FormEvent<HTMLFormElement>) {
    if (!confirm(`Delete "${clientName}"? This cannot be undone.`)) {
      event.preventDefault();
    }
  }

  return (
    <form action={deleteClient} onSubmit={confirmDelete}>
      <input type="hidden" name="clientId" value={clientId} />
      <button
        type="submit"
        disabled={disabled}
        className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Delete client
      </button>
    </form>
  );
}
