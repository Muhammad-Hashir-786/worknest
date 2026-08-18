import "server-only";
import connectDB from "../lib/db";
import Invitation from "../models/invitation";
import "../models/organization";
import UserOrganization from "../models/user_organization";
import { generateToken } from "../lib/utils/token";
import type { InvitableRole } from "../lib/constants/roles";

const INVITATION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export interface PendingInvitationSummary {
  id: string;
  email: string;
  role: InvitableRole;
  expiresAt: Date;
  createdAt: Date;
}

export async function getPendingInvitations(
  organizationId: string
): Promise<PendingInvitationSummary[]> {
  await connectDB();

  const invitations = await Invitation.find({
    organization: organizationId,
    status: "pending",
  })
    .sort({ createdAt: -1 })
    .lean();

  return invitations.map((invitation) => ({
    id: invitation._id.toString(),
    email: invitation.email,
    role: invitation.role as InvitableRole,
    expiresAt: invitation.expiresAt,
    createdAt: invitation.createdAt,
  }));
}

/**
 * Creates a pending invitation. Any existing pending invitation for the
 * same email in the same org is replaced (re-inviting resets the token and
 * expiry instead of piling up duplicate rows and confusing which link is
 * actually valid).
 */
export async function createInvitation(params: {
  organizationId: string;
  email: string;
  role: InvitableRole;
  invitedBy: string;
}): Promise<{ token: string }> {
  await connectDB();

  await Invitation.deleteOne({
    organization: params.organizationId,
    email: params.email,
    status: "pending",
  });

  const token = generateToken();

  await Invitation.create({
    organization: params.organizationId,
    email: params.email,
    role: params.role,
    token,
    expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
    invitedBy: params.invitedBy,
    status: "pending",
  });

  return { token };
}

export async function revokeInvitation(
  invitationId: string,
  organizationId: string
): Promise<void> {
  await connectDB();
  // Scoped to organizationId so an admin can only revoke invitations that
  // belong to the org whose membership was already verified for them.
  await Invitation.deleteOne({ _id: invitationId, organization: organizationId });
}

export interface ResolvedInvitation {
  id: string;
  organizationId: string;
  organizationName: string;
  email: string;
  role: InvitableRole;
}

/**
 * Looks up a pending invitation by its token. Expired invitations are
 * flipped to status "expired" as a side effect of being looked up (lazy
 * cleanup instead of a scheduled job) and reported as not found either way.
 */
export async function resolveInvitationToken(
  token: string
): Promise<ResolvedInvitation | null> {
  await connectDB();

  const invitation = await Invitation.findOne({ token, status: "pending" }).populate(
    "organization",
    "name"
  );
  if (!invitation) return null;

  if (invitation.expiresAt.getTime() < Date.now()) {
    invitation.status = "expired";
    await invitation.save();
    return null;
  }

  const organization = invitation.organization as unknown as {
    _id: { toString(): string };
    name: string;
  };

  return {
    id: invitation._id.toString(),
    organizationId: organization._id.toString(),
    organizationName: organization.name,
    email: invitation.email,
    role: invitation.role as InvitableRole,
  };
}

/**
 * Accepts an invitation for an already-authenticated user whose email has
 * been confirmed (by the caller) to match the invitation. Creates the
 * membership if one doesn't already exist and marks the invitation
 * accepted. Idempotent: accepting twice (e.g. a double click) doesn't
 * create a duplicate membership or error, since UserOrganization also has
 * a unique (user, organization) index as a backstop.
 */
export async function acceptInvitation(
  invitationId: string,
  userId: string,
  organizationId: string,
  role: InvitableRole
): Promise<void> {
  await connectDB();

  const existingMembership = await UserOrganization.findOne({
    user: userId,
    organization: organizationId,
  });

  if (!existingMembership) {
    await UserOrganization.create({ user: userId, organization: organizationId, role });
  }

  await Invitation.updateOne({ _id: invitationId }, { status: "accepted" });
}
