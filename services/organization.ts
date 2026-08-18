import "server-only";
import { isValidObjectId } from "mongoose";
import connectDB from "../lib/db";
import UserOrganization from "../models/user_organization";
import User from "../models/user";
import "../models/organization";
import type { OrgRole } from "../lib/constants/roles";

export interface OrganizationMembership {
  role: OrgRole;
  organizationId: string;
}

/**
 * The single place that answers "is this user actually in this
 * organization, and with what role?" This is the core multi-tenancy
 * primitive - every organization-scoped action or query should confirm
 * membership through this rather than trusting an organizationId that
 * arrived from the client.
 */
export async function getMembership(
  userId: string,
  organizationId: string
): Promise<OrganizationMembership | null> {
  if (!isValidObjectId(organizationId)) return null;

  await connectDB();

  const membership = await UserOrganization.findOne({
    user: userId,
    organization: organizationId,
  })
    .select("role organization")
    .lean();

  if (!membership) return null;

  return {
    role: membership.role as OrgRole,
    organizationId: membership.organization.toString(),
  };
}

export interface UserOrganizationSummary {
  organization: {
    id: string;
    name: string;
    slug: string;
    logo: string;
    industry: string;
    companySize: string;
  };
  role: OrgRole;
  joinedAt: Date;
}

/**
 * All organizations a user belongs to, most recently joined first. Used for
 * the org switcher and the onboarding "choose a workspace" screen.
 */
export async function getUserOrganizations(
  userId: string
): Promise<UserOrganizationSummary[]> {
  await connectDB();

  const memberships = await UserOrganization.find({ user: userId })
    .populate("organization")
    .sort({ joinedAt: -1 })
    .lean();

  return memberships
    .filter(
      (membership): membership is typeof membership & { organization: NonNullable<typeof membership.organization> } =>
        Boolean(membership.organization) // defensive: skip memberships pointing at a deleted org
    )
    .map((membership) => {
      const org = membership.organization as unknown as {
        _id: { toString(): string };
        name: string;
        slug: string;
        logo: string;
        industry: string;
        companySize: string;
      };

      return {
        organization: {
          id: org._id.toString(),
          name: org.name,
          slug: org.slug,
          logo: org.logo,
          industry: org.industry,
          companySize: org.companySize,
        },
        role: membership.role as OrgRole,
        joinedAt: membership.joinedAt,
      };
    });
}

export interface OrganizationMemberSummary {
  membershipId: string;
  role: OrgRole;
  joinedAt: Date;
  user: {
    id: string;
    name: string;
    email: string;
    avatar: string;
  };
}

/**
 * Every member of an organization, oldest membership first. Used by the
 * Team settings page - member removal/role changes act on the
 * `membershipId` returned here, never on a raw userId, so those actions can
 * scope their lookup to (membershipId + organization) in one query.
 */
export async function getOrganizationMembers(
  organizationId: string
): Promise<OrganizationMemberSummary[]> {
  await connectDB();

  const memberships = await UserOrganization.find({ organization: organizationId })
    .populate("user", "name email avatar")
    .sort({ joinedAt: 1 })
    .lean();

  return memberships
    .filter(
      (membership): membership is typeof membership & { user: NonNullable<typeof membership.user> } =>
        Boolean(membership.user) // defensive: skip memberships pointing at a deleted user
    )
    .map((membership) => {
      const user = membership.user as unknown as {
        _id: { toString(): string };
        name: string;
        email: string;
        avatar: string;
      };

      return {
        membershipId: membership._id.toString(),
        role: membership.role as OrgRole,
        joinedAt: membership.joinedAt,
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          avatar: user.avatar,
        },
      };
    });
}

/**
 * Whether the given email already belongs to this organization - checked
 * before creating an invitation so admins get an immediate, friendly error
 * instead of a person accepting an invite into an org they're already in.
 */
export async function isEmailAlreadyMember(
  organizationId: string,
  email: string
): Promise<boolean> {
  await connectDB();

  const user = await User.findOne({ email }).select("_id").lean();
  if (!user) return false;

  const membership = await UserOrganization.exists({
    organization: organizationId,
    user: user._id,
  });

  return Boolean(membership);
}
