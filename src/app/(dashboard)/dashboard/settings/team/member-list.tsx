"use client";

import { useActionState, useRef } from "react";
import Avatar from "~/components/ui/avatar";
import { changeMemberRole, removeMember, type TeamActionState } from "~/actions/invitation";
import { INVITABLE_ROLES } from "~/lib/constants/roles";
import type { OrgRole } from "~/lib/constants/roles";

const initialState: TeamActionState = {};

interface Member {
  membershipId: string;
  role: OrgRole;
  user: { id: string; name: string; email: string; avatar: string };
}

export default function MemberList({
  members,
  currentUserId,
  canManage,
}: {
  members: Member[];
  currentUserId: string;
  canManage: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-md border border-neutral-200">
      <table className="w-full text-sm">
        <tbody className="divide-y divide-neutral-100">
          {members.map((member) => (
            <MemberRow
              key={member.membershipId}
              member={member}
              isSelf={member.user.id === currentUserId}
              canManage={canManage}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MemberRow({
  member,
  isSelf,
  canManage,
}: {
  member: Member;
  isSelf: boolean;
  canManage: boolean;
}) {
  const [changeState, changeAction] = useActionState(changeMemberRole, initialState);
  const [removeState, removeAction] = useActionState(removeMember, initialState);
  const removeFormRef = useRef<HTMLFormElement>(null);
  // Owner is never editable through this UI - ownership transfers, it isn't
  // reassigned via a role dropdown (see INVITABLE_ROLES).
  const editable = canManage && !isSelf && member.role !== "owner";

  function confirmRemove(event: React.FormEvent<HTMLFormElement>) {
    if (!confirm(`Remove ${member.user.name} from the organization?`)) {
      event.preventDefault();
    }
  }

  return (
    <tr>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar name={member.user.name} />
          <div>
              <p className="font-semibold text-neutral-900">
              {member.user.name} {isSelf && <span className="text-neutral-400">(you)</span>}
            </p>
            <p className="text-xs text-neutral-500">{member.user.email}</p>
            {(changeState.error || removeState.error) && (
              <p className="text-xs text-red-600">{changeState.error ?? removeState.error}</p>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        {editable ? (
          <div className="flex items-center justify-end gap-2">
            <form action={changeAction}>
              <input type="hidden" name="membershipId" value={member.membershipId} />
              <select
                name="role"
                defaultValue={member.role}
                onChange={(event) => event.currentTarget.form?.requestSubmit()}
                className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs focus:border-neutral-500 focus:outline-none"
              >
                {INVITABLE_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </form>
            <form ref={removeFormRef} action={removeAction} onSubmit={confirmRemove}>
              <input type="hidden" name="membershipId" value={member.membershipId} />
              <button
                type="submit"
                className="rounded-md border border-neutral-300 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
              >
                Remove
              </button>
            </form>
          </div>
        ) : (
          <span className="text-xs uppercase tracking-wide text-neutral-500">{member.role}</span>
        )}
      </td>
    </tr>
  );
}
