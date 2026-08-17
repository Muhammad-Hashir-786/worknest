import type { Metadata } from "next";
import { requireOrgContext } from "~/lib/auth/current-org";
import { can } from "~/lib/permissions/permissions";
import { getOrganizationMembers } from "~/services/organization";
import { getPendingInvitations } from "~/services/invitation";
import InviteMemberForm from "./invite-member-form";
import MemberList from "./member-list";
import PendingInvitations from "./pending-invitations";

export const metadata: Metadata = { title: "Team - WorkNest" };

export default async function TeamSettingsPage() {
  const { organization, role, user } = await requireOrgContext();
  const canInvite = can(role, "members:invite");
  const canManageMembers = can(role, "members:remove") || can(role, "members:changeRole");

  const [members, pendingInvitations] = await Promise.all([
    getOrganizationMembers(organization.id),
    canInvite ? getPendingInvitations(organization.id) : Promise.resolve([]),
  ]);

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Team</h1>
        <p className="mt-1 text-sm text-neutral-600">
          {members.length} member{members.length === 1 ? "" : "s"} in {organization.name}.
        </p>
      </div>

      {canInvite && (
        <section>
          <h2 className="text-sm font-medium text-neutral-900">Invite someone</h2>
          <div className="mt-2">
            <InviteMemberForm />
          </div>
        </section>
      )}

      <section>
        <h2 className="text-sm font-medium text-neutral-900">Members</h2>
        <div className="mt-2">
          <MemberList members={members} currentUserId={user.id} canManage={canManageMembers} />
        </div>
      </section>

      {canInvite && (
        <section>
          <h2 className="text-sm font-medium text-neutral-900">Pending invitations</h2>
          <div className="mt-2">
            <PendingInvitations invitations={pendingInvitations} />
          </div>
        </section>
      )}
    </div>
  );
}
