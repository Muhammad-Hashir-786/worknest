import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import connectDB from "../../lib/db";
import Organization from "../../models/organization";
import { getCurrentUser, type CurrentUser } from "./current-user";
import { getMembership } from "../../services/organization";
import type { OrgRole } from "../../lib/constants/roles";

export const ACTIVE_ORG_COOKIE = "worknest_active_org";
const ACTIVE_ORG_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export interface CurrentOrganization {
  id: string;
  name: string;
  slug: string;
  logo: string;
  industry: string;
  companySize: string;
  joinRequestsEnabled: boolean;
}

export interface OrgContext {
  user: CurrentUser;
  organization: CurrentOrganization | null;
  role: OrgRole | null;
}

export async function setActiveOrganization(organizationId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ORG_COOKIE, organizationId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ACTIVE_ORG_COOKIE_MAX_AGE,
  });
}

export async function clearActiveOrganization(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ACTIVE_ORG_COOKIE);
}

/**
 * Resolves the signed-in user's active organization.
 *
 * The cookie only records *which* organization the user last selected - it
 * is never trusted by itself. Every call re-verifies membership against the
 * database, so a stale cookie (the user was removed from the org) or a
 * tampered one (someone edited the cookie value directly) can never grant
 * access to an organization the user isn't currently a member of.
 */
export async function getCurrentOrgContext(): Promise<OrgContext | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const cookieStore = await cookies();
  const activeOrgId = cookieStore.get(ACTIVE_ORG_COOKIE)?.value;

  if (!activeOrgId) {
    return { user, organization: null, role: null };
  }

  const membership = await getMembership(user.id, activeOrgId);
  if (!membership) {
    // Points at an organization the user isn't (or is no longer) a member
    // of - drop the dead cookie instead of letting it linger.
    await clearActiveOrganization();
    return { user, organization: null, role: null };
  }

  await connectDB();
  const org = await Organization.findById(activeOrgId).lean();
  if (!org) {
    await clearActiveOrganization();
    return { user, organization: null, role: null };
  }

  return {
    user,
    organization: {
      id: org._id.toString(),
      name: org.name,
      slug: org.slug,
      logo: org.logo,
      industry: org.industry,
      companySize: org.companySize,
      joinRequestsEnabled: org.joinRequestsEnabled !== false,
    },
    role: membership.role,
  };
}

/**
 * Same resolution as getCurrentOrgContext, but redirects instead of
 * returning nulls. Use this at the top of any dashboard page, layout, or
 * server action that requires a logged-in user with a verified active
 * organization - callers never have to null-check the result.
 */
export async function requireOrgContext(): Promise<{
  user: CurrentUser;
  organization: CurrentOrganization;
  role: OrgRole;
}> {
  const context = await getCurrentOrgContext();

  if (!context) {
    redirect("/login");
  }
  if (!context.organization || !context.role) {
    redirect("/onboarding");
  }

  return {
    user: context.user,
    organization: context.organization,
    role: context.role,
  };
}
