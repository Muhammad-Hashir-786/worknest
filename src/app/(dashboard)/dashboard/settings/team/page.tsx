import type { Metadata } from "next";
import { requireOrgContext } from "~/lib/auth/current-org";
import { can } from "~/lib/permissions/permissions";
import { getOrganizationMembers } from "~/services/organization";
import { getPendingInvitations } from "~/services/invitation";
import InviteMemberForm from "./invite-member-form";
import MemberList from "./member-list";
import PendingInvitations from "./pending-invitations";
import PageHeader from "~/components/ui/page-header";
import { getOrganizationJoinRequests } from "~/services/join-request";
import JoinRequests from "./join-requests";

export const metadata: Metadata = { title: "Team - WorkNest" };

export default async function TeamSettingsPage() {
  const { organization, role, user } = await requireOrgContext();
  const canInvite = can(role, "members:invite");
  const canManageMembers = can(role, "members:remove") || can(role, "members:changeRole");

  const [members, pendingInvitations, joinRequests] = await Promise.all([
    getOrganizationMembers(organization.id),
    canInvite ? getPendingInvitations(organization.id) : Promise.resolve([]),
    canInvite ? getOrganizationJoinRequests(organization.id) : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-7">
      <PageHeader eyebrow="People & permissions" title="Team" description={`${members.length} member${members.length === 1 ? "" : "s"} in ${organization.name}. Build a focused team and keep every role clear.`} />

      {canInvite && (
        <section className="worknest-panel rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#d92d27]">Grow your workspace</p><h2 className="mt-1 font-bold text-neutral-900">Invite someone</h2>
          <div className="mt-4">
            <InviteMemberForm />
          </div>
        </section>
      )}

      {canInvite && <section className="worknest-panel rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6"><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#d92d27]">Approval queue</p><h2 className="mt-1 font-bold text-neutral-900">Join requests</h2><p className="mt-1 text-sm text-neutral-500">Review people who asked to join this organization. Approved users enter as members and can be assigned to projects.</p><div className="mt-4"><JoinRequests requests={joinRequests} /></div></section>}

      <section className="worknest-panel rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6">
        <div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#d92d27]">Your people</p><h2 className="mt-1 font-bold text-neutral-900">Members</h2></div><span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-bold text-neutral-500">{members.length} total</span></div>
        <div className="mt-4">
          <MemberList members={members} currentUserId={user.id} canManage={canManageMembers} />
        </div>
      </section>

      {canInvite && (
        <section className="worknest-panel rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#d92d27]">In progress</p><h2 className="mt-1 font-bold text-neutral-900">Pending invitations</h2>
          <div className="mt-4">
            <PendingInvitations invitations={pendingInvitations} />
          </div>
        </section>
      )}
    </div>
  );
}
