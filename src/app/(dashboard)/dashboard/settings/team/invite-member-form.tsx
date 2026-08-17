"use client";

import { useActionState, useState } from "react";
import { inviteMember, type TeamActionState } from "~/actions/invitation";
import { INVITABLE_ROLES } from "~/lib/constants/roles";

const initialState: TeamActionState = {};

export default function InviteMemberForm() {
  const [state, formAction, pending] = useActionState(inviteMember, initialState);
  const [copied, setCopied] = useState(false);

  async function copyLink(link: string) {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can fail (permissions, insecure context) - the link
      // is still shown in the input for manual copy either way.
    }
  }

  return (
    <div className="space-y-3">
      <form action={formAction} className="flex flex-wrap items-start gap-2">
        <div className="flex-1 min-w-[200px]">
          <input
            name="email"
            type="email"
            placeholder="teammate@company.com"
            required
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          />
          {state.fieldErrors?.email && (
            <p className="mt-1 text-sm text-red-600">{state.fieldErrors.email}</p>
          )}
        </div>

        <select
          name="role"
          defaultValue="member"
          className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
        >
          {INVITABLE_ROLES.map((invitableRole) => (
            <option key={invitableRole} value={invitableRole}>
              {invitableRole}
            </option>
          ))}
        </select>

        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {pending ? "Sending..." : "Invite"}
        </button>
      </form>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      {state.success && state.inviteLink && (
        <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
          <p className="text-sm text-neutral-700">
            Invitation created. No email provider is configured yet, so share this link directly:
          </p>
          <div className="mt-2 flex items-center gap-2">
            <input
              readOnly
              value={state.inviteLink}
              onFocus={(event) => event.currentTarget.select()}
              className="flex-1 rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs text-neutral-700"
            />
            <button
              type="button"
              onClick={() => copyLink(state.inviteLink!)}
              className="rounded-md border border-neutral-300 px-2 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-100"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
