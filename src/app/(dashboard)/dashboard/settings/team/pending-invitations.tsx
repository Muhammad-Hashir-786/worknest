"use client";

import { useActionState } from "react";
import { cancelInvitation, type TeamActionState } from "~/actions/invitation";

const initialState: TeamActionState = {};

interface Invitation {
  id: string;
  email: string;
  role: string;
  expiresAt: Date;
}

export default function PendingInvitations({ invitations }: { invitations: Invitation[] }) {
  if (invitations.length === 0) {
    return <p className="text-sm text-neutral-500">No pending invitations.</p>;
  }

  return (
    <ul className="divide-y divide-neutral-100 rounded-md border border-neutral-200">
      {invitations.map((invitation) => (
        <InvitationRow key={invitation.id} invitation={invitation} />
      ))}
    </ul>
  );
}

function InvitationRow({ invitation }: { invitation: Invitation }) {
  const [state, formAction] = useActionState(cancelInvitation, initialState);

  return (
    <li className="flex items-center justify-between px-4 py-3 text-sm">
      <div>
        <p className="font-medium text-neutral-900">{invitation.email}</p>
        <p className="text-xs text-neutral-500">
          Invited as {invitation.role} · expires{" "}
          {new Date(invitation.expiresAt).toLocaleDateString()}
        </p>
        {state.error && <p className="text-xs text-red-600">{state.error}</p>}
      </div>
      <form action={formAction}>
        <input type="hidden" name="invitationId" value={invitation.id} />
        <button
          type="submit"
          className="rounded-md border border-neutral-300 px-2 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-100"
        >
          Cancel
        </button>
      </form>
    </li>
  );
}
