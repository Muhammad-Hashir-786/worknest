"use client";

import { useActionState } from "react";
import Image from "next/image";
import {
  addProjectMember,
  removeProjectMember,
  type ProjectMemberActionState,
} from "~/actions/project";
import { PROJECT_MEMBER_ROLES } from "~/lib/constants/roles";
import type { ProjectMemberSummary } from "~/services/project";

const initialState: ProjectMemberActionState = {};

interface AddableMember {
  userId: string;
  name: string;
  email: string;
}

export default function ProjectMembers({
  projectId,
  members,
  addableMembers,
  canManage,
}: {
  projectId: string;
  members: ProjectMemberSummary[];
  addableMembers: AddableMember[];
  canManage: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-md border border-neutral-200">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-neutral-100">
            {members.map((member) => (
              <MemberRow
                key={member.membershipId}
                projectId={projectId}
                member={member}
                canManage={canManage}
              />
            ))}
          </tbody>
        </table>
      </div>

      {canManage && addableMembers.length > 0 && <AddMemberForm projectId={projectId} addableMembers={addableMembers} />}
    </div>
  );
}

function MemberRow({
  projectId,
  member,
  canManage,
}: {
  projectId: string;
  member: ProjectMemberSummary;
  canManage: boolean;
}) {
  const [state, formAction] = useActionState(removeProjectMember, initialState);

  function confirmRemove(event: React.FormEvent<HTMLFormElement>) {
    if (!confirm(`Remove ${member.user.name} from this project?`)) {
      event.preventDefault();
    }
  }

  return (
    <tr>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <Image
            src={member.user.avatar}
            alt=""
            width={32}
            height={32}
            className="h-8 w-8 rounded-full object-cover"
          />
          <div>
            <p className="font-medium text-neutral-900">{member.user.name}</p>
            <p className="text-xs text-neutral-500">{member.user.email}</p>
            {state.error && <p className="text-xs text-red-600">{state.error}</p>}
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-2">
          <span className="text-xs uppercase tracking-wide text-neutral-500">{member.role}</span>
          {canManage && (
            <form action={formAction} onSubmit={confirmRemove}>
              <input type="hidden" name="projectId" value={projectId} />
              <input type="hidden" name="membershipId" value={member.membershipId} />
              <button
                type="submit"
                className="rounded-md border border-neutral-300 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
              >
                Remove
              </button>
            </form>
          )}
        </div>
      </td>
    </tr>
  );
}

function AddMemberForm({
  projectId,
  addableMembers,
}: {
  projectId: string;
  addableMembers: AddableMember[];
}) {
  const [state, formAction, pending] = useActionState(addProjectMember, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="projectId" value={projectId} />

      <select
        name="userId"
        defaultValue={addableMembers[0]?.userId}
        className="min-w-[180px] rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
      >
        {addableMembers.map((member) => (
          <option key={member.userId} value={member.userId}>
            {member.name} ({member.email})
          </option>
        ))}
      </select>

      <select
        name="role"
        defaultValue="member"
        className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
      >
        {PROJECT_MEMBER_ROLES.map((role) => (
          <option key={role} value={role}>
            {role}
          </option>
        ))}
      </select>

      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-50"
      >
        {pending ? "Adding..." : "Add to project"}
      </button>

      {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
