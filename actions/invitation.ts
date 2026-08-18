"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import connectDB from "../lib/db";
import UserOrganization from "../models/user_organization";
import { requireOrgContext } from "../lib/auth/current-org";
import { getCurrentUser } from "../lib/auth/current-user";
import { setActiveOrganization } from "../lib/auth/current-org";
import { can, PERMISSION_DENIED_MESSAGE } from "../lib/permissions/permissions";
import { logActivity } from "~/services/activity";
import {
  inviteMemberSchema,
  changeMemberRoleSchema,
  removeMemberSchema,
  cancelInvitationSchema,
} from "../lib/validations/invitation";
import { isEmailAlreadyMember } from "../services/organization";
import {
  createInvitation,
  revokeInvitation,
  resolveInvitationToken,
  acceptInvitation,
} from "~/services/invitation";

const TEAM_PATH = "/dashboard/settings/team";

export interface TeamActionState {
  error?: string;
  fieldErrors?: Partial<Record<string, string>>;
  success?: boolean;
  inviteLink?: string;
}

function fieldErrorsFrom(error: { path: PropertyKey[]; message: string }[]) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error) {
    const key = issue.path[0]?.toString();
    if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

export async function inviteMember(
  _prevState: TeamActionState,
  formData: FormData
): Promise<TeamActionState> {
  const { organization, role, user } = await requireOrgContext();

  if (!can(role, "members:invite")) {
    return { error: PERMISSION_DENIED_MESSAGE };
  }

  const parsed = inviteMemberSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }

  const { email, role: invitedRole } = parsed.data;

  if (await isEmailAlreadyMember(organization.id, email)) {
    return { fieldErrors: { email: "This person is already a member of the organization." } };
  }

  const { token } = await createInvitation({
    organizationId: organization.id,
    email,
    role: invitedRole,
    invitedBy: user.id,
  });
  await logActivity({ organizationId: organization.id, userId: user.id, action: "invited", entityType: "Organization", entityId: organization.id, metadata: { email, role: invitedRole } });

  // No email provider is wired up for this submission (see .env.example) -
  // the invite link is surfaced directly in the UI instead of emailed, so
  // the whole flow is testable without external credentials. Swapping in a
  // real provider later only touches this one call site.
  const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${token}`;

  revalidatePath(TEAM_PATH);
  return { success: true, inviteLink };
}

export async function cancelInvitation(
  _prevState: TeamActionState,
  formData: FormData
): Promise<TeamActionState> {
  const { organization, role } = await requireOrgContext();

  if (!can(role, "members:invite")) {
    return { error: PERMISSION_DENIED_MESSAGE };
  }

  const parsed = cancelInvitationSchema.safeParse({
    invitationId: formData.get("invitationId"),
  });
  if (!parsed.success) {
    return { error: "Invalid request." };
  }

  await revokeInvitation(parsed.data.invitationId, organization.id);

  revalidatePath(TEAM_PATH);
  return { success: true };
}

export async function changeMemberRole(
  _prevState: TeamActionState,
  formData: FormData
): Promise<TeamActionState> {
  const { organization, role, user } = await requireOrgContext();

  if (!can(role, "members:changeRole")) {
    return { error: PERMISSION_DENIED_MESSAGE };
  }

  const parsed = changeMemberRoleSchema.safeParse({
    membershipId: formData.get("membershipId"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { error: "Invalid request." };
  }

  await connectDB();

  // Scoped to (membershipId, organization) - never trust membershipId
  // alone, or an org-A admin could pass a membership id belonging to org B.
  const membership = await UserOrganization.findOne({
    _id: parsed.data.membershipId,
    organization: organization.id,
  });

  if (!membership) {
    return { error: "Member not found." };
  }
  if (membership.user.toString() === user.id) {
    return { error: "You can't change your own role." };
  }
  if (membership.role === "owner") {
    return { error: "Ownership can't be changed here." };
  }

  membership.role = parsed.data.role;
  await membership.save();
  await logActivity({ organizationId: organization.id, userId: user.id, action: "updated", entityType: "User", entityId: membership.user.toString(), metadata: { event: "role_changed", role: parsed.data.role } });

  revalidatePath(TEAM_PATH);
  return { success: true };
}

export async function removeMember(
  _prevState: TeamActionState,
  formData: FormData
): Promise<TeamActionState> {
  const { organization, role, user } = await requireOrgContext();

  if (!can(role, "members:remove")) {
    return { error: PERMISSION_DENIED_MESSAGE };
  }

  const parsed = removeMemberSchema.safeParse({
    membershipId: formData.get("membershipId"),
  });
  if (!parsed.success) {
    return { error: "Invalid request." };
  }

  await connectDB();

  const membership = await UserOrganization.findOne({
    _id: parsed.data.membershipId,
    organization: organization.id,
  });

  if (!membership) {
    return { error: "Member not found." };
  }
  if (membership.user.toString() === user.id) {
    return { error: "You can't remove yourself from the organization." };
  }
  if (membership.role === "owner") {
    return { error: "The organization owner can't be removed." };
  }

  await membership.deleteOne();
  await logActivity({ organizationId: organization.id, userId: user.id, action: "deleted", entityType: "User", entityId: membership.user.toString(), metadata: { event: "member_removed" } });

  revalidatePath(TEAM_PATH);
  return { success: true };
}

/**
 * Bound to a plain <form action={acceptInvitationAction}> on the invite
 * page - a submit-and-redirect flow, not a useActionState form, since the
 * page itself re-derives and displays whatever error state applies (no
 * account, wrong account, expired link) rather than the action reporting it.
 */
export async function acceptInvitationAction(formData: FormData): Promise<void> {
  const token = formData.get("token");
  if (typeof token !== "string" || !token) {
    redirect("/dashboard");
  }

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/invite/${token}`)}`);
  }

  const invitation = await resolveInvitationToken(token);

  // Missing/expired, or logged in as the wrong account - either way, send
  // back to the invite page itself so it can render the right explanation
  // rather than duplicating that logic here.
  if (!invitation || invitation.email !== user.email) {
    redirect(`/invite/${token}`);
  }

  await acceptInvitation(invitation.id, user.id, invitation.organizationId, invitation.role);
  await setActiveOrganization(invitation.organizationId);

  redirect("/dashboard");
}
