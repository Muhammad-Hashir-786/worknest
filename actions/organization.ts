"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import connectDB from "../lib/db";
import Organization from "../models/organization";
import UserOrganization from "../models/user_organization";
import {
  createOrganizationSchema,
  updateOrganizationSchema,
} from "../lib/validations/organization";
import { generateUniqueSlug } from "../lib/utils/slug";
import { getCurrentUser } from "../lib/auth/current-user";
import { setActiveOrganization, requireOrgContext } from "../lib/auth/current-org";
import { getMembership } from "../services/organization";
import { can } from "../lib/permissions/permissions";

export interface OrgActionState {
  error?: string;
  fieldErrors?: Partial<Record<string, string>>;
  success?: boolean;
}

function fieldErrorsFrom(error: { path: PropertyKey[]; message: string }[]) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error) {
    const key = issue.path[0]?.toString();
    if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

export async function createOrganization(
  _prevState: OrgActionState,
  formData: FormData
): Promise<OrgActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const parsed = createOrganizationSchema.safeParse({
    name: formData.get("name"),
    industry: formData.get("industry"),
    companySize: formData.get("companySize"),
  });

  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }

  const { name, industry, companySize } = parsed.data;

  await connectDB();
  const slug = await generateUniqueSlug(name);

  const organization = await Organization.create({ name, slug, industry, companySize });

  // The creator is always the owner - ownership is granted this way and no
  // other (there's no "invite someone as owner" path, see INVITABLE_ROLES).
  await UserOrganization.create({
    user: user.id,
    organization: organization._id,
    role: "owner",
  });

  await setActiveOrganization(organization._id.toString());
  redirect("/dashboard");
}

/**
 * Bound directly to a <form action={switchOrganization}> - no useActionState
 * wrapper needed since the org switcher just needs a plain submit-and-redirect.
 */
export async function switchOrganization(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const organizationId = formData.get("organizationId");
  if (typeof organizationId !== "string" || !organizationId) {
    redirect("/onboarding");
  }

  // Never trust the posted id by itself - confirm real membership first.
  const membership = await getMembership(user.id, organizationId);
  if (!membership) {
    redirect("/onboarding");
  }

  await setActiveOrganization(organizationId);
  redirect("/dashboard");
}

export async function updateOrganization(
  _prevState: OrgActionState,
  formData: FormData
): Promise<OrgActionState> {
  const { organization, role } = await requireOrgContext();

  if (!can(role, "organization:update")) {
    return { error: "Only owners and admins can update organization settings." };
  }

  const parsed = updateOrganizationSchema.safeParse({
    name: formData.get("name"),
    industry: formData.get("industry"),
    companySize: formData.get("companySize"),
    logo: formData.get("logo"),
    joinRequestsEnabled: formData.get("joinRequestsEnabled") === "on",
    slug: formData.get("slug"),
  });

  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }

  const { name, industry, companySize, logo, joinRequestsEnabled, slug } = parsed.data;

  await connectDB();
  const duplicate = await Organization.findOne({ slug, _id: { $ne: organization.id } }).select("_id").lean();
  if (duplicate) return { fieldErrors: { slug: "That organization handle is already taken." } };
  // organization.id comes from requireOrgContext (session + verified
  // membership), never from the submitted form - so there's no way to post
  // a different organizationId and edit an org you don't belong to.
  await Organization.findByIdAndUpdate(organization.id, {
    name,
    industry,
    companySize,
    ...(logo ? { logo } : {}),
    joinRequestsEnabled,
    slug,
  });

  revalidatePath("/dashboard/settings/organization");
  return { success: true };
}
