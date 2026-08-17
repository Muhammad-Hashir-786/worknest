"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireOrgContext } from "../lib/auth/current-org";
import { can, PERMISSION_DENIED_MESSAGE } from "../lib/permissions/permissions";
import {
  createProjectSchema,
  updateProjectSchema,
  addProjectMemberSchema,
  removeProjectMemberSchema,
  NEW_CLIENT_VALUE,
} from "../lib/validations/project";
import {
  createProject as createProjectRecord,
  updateProject as updateProjectRecord,
  deleteProject as deleteProjectRecord,
  addProjectMember as addProjectMemberRecord,
  removeProjectMember as removeProjectMemberRecord,
  getProjectForOrg,
} from "../services/project";
import { createClient, getClientIdForOrg } from "../services/client";
import { logActivity } from "~/services/activity";

export interface ProjectActionState {
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

export async function createProject(
  _prevState: ProjectActionState,
  formData: FormData
): Promise<ProjectActionState> {
  const { organization, role, user } = await requireOrgContext();

  if (!can(role, "projects:create")) {
    return { error: PERMISSION_DENIED_MESSAGE };
  }

  const parsed = createProjectSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    priority: formData.get("priority"),
    startDate: formData.get("startDate"),
    deadline: formData.get("deadline"),
    clientId: formData.get("clientId"),
    newClientName: formData.get("newClientName"),
    newClientCompany: formData.get("newClientCompany"),
    newClientEmail: formData.get("newClientEmail"),
  });

  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }

  const data = parsed.data;

  // Resolve the client reference first: either verify an existing client
  // belongs to this organization, or create a new one on the fly. Either
  // way `clientId` below is a real, org-verified id before the project is
  // ever created - the schema requires client to be a valid reference.
  let clientId: string;
  if (data.clientId === NEW_CLIENT_VALUE) {
    const client = await createClient({
      organizationId: organization.id,
      name: data.newClientName!.trim(),
      company: data.newClientCompany,
      email: data.newClientEmail,
    });
    clientId = client.id;
  } else {
    const verifiedClientId = await getClientIdForOrg(data.clientId, organization.id);
    if (!verifiedClientId) {
      return { fieldErrors: { clientId: "Select a valid client." } };
    }
    clientId = verifiedClientId;
  }

  const project = await createProjectRecord({
    organizationId: organization.id,
    createdBy: user.id,
    name: data.name,
    description: data.description,
    priority: data.priority,
    startDate: new Date(data.startDate),
    deadline: new Date(data.deadline),
    clientId,
  });
  await logActivity({ organizationId: organization.id, userId: user.id, action: "created", entityType: "Project", entityId: project.id, metadata: { name: data.name } });

  revalidatePath("/dashboard/projects");
  redirect(`/dashboard/projects/${project.id}`);
}

export async function updateProject(
  _prevState: ProjectActionState,
  formData: FormData
): Promise<ProjectActionState> {
  const { organization, role, user } = await requireOrgContext();

  if (!can(role, "projects:update")) {
    return { error: PERMISSION_DENIED_MESSAGE };
  }

  const projectId = formData.get("projectId");
  if (typeof projectId !== "string" || !projectId) {
    return { error: "Project not found." };
  }

  const parsed = updateProjectSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    status: formData.get("status"),
    priority: formData.get("priority"),
    startDate: formData.get("startDate"),
    deadline: formData.get("deadline"),
    clientId: formData.get("clientId"),
  });

  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }

  const data = parsed.data;

  const verifiedClientId = await getClientIdForOrg(data.clientId, organization.id);
  if (!verifiedClientId) {
    return { fieldErrors: { clientId: "Select a valid client." } };
  }

  // organization.id comes from the verified session context, never from
  // the form - updateProject's own query is additionally scoped to it, so
  // there is no way to post another organization's projectId and edit it.
  const updated = await updateProjectRecord(projectId, organization.id, {
    name: data.name,
    description: data.description,
    status: data.status,
    priority: data.priority,
    startDate: new Date(data.startDate),
    deadline: new Date(data.deadline),
    clientId: verifiedClientId,
  });

  if (!updated) {
    return { error: "Project not found." };
  }
  await logActivity({ organizationId: organization.id, userId: user.id, action: "updated", entityType: "Project", entityId: projectId, metadata: { name: data.name, status: data.status } });

  revalidatePath(`/dashboard/projects/${projectId}`);
  revalidatePath("/dashboard/projects");
  return { success: true };
}

/**
 * Bound directly to a <form action={deleteProject}> (with a hidden
 * projectId field) - a plain submit-and-redirect like switchOrganization,
 * no useActionState wrapper needed since there's no form to re-render on
 * failure. A permission or not-found failure just redirects back to the
 * project instead of silently doing nothing.
 */
export async function deleteProject(formData: FormData): Promise<void> {
  const { organization, role, user } = await requireOrgContext();

  const projectId = formData.get("projectId");
  if (typeof projectId !== "string" || !projectId) {
    redirect("/dashboard/projects");
  }

  if (!can(role, "projects:delete")) {
    redirect(`/dashboard/projects/${projectId}`);
  }

  const project = await getProjectForOrg(projectId, organization.id);
  if (!project) {
    redirect("/dashboard/projects");
  }

  await deleteProjectRecord(projectId, organization.id);
  await logActivity({ organizationId: organization.id, userId: user.id, action: "deleted", entityType: "Project", entityId: projectId, metadata: { name: project.name } });

  revalidatePath("/dashboard/projects");
  redirect("/dashboard/projects");
}

export interface ProjectMemberActionState {
  error?: string;
  success?: boolean;
}

export async function addProjectMember(
  _prevState: ProjectMemberActionState,
  formData: FormData
): Promise<ProjectMemberActionState> {
  const { organization, role } = await requireOrgContext();

  if (!can(role, "projects:manageMembers")) {
    return { error: PERMISSION_DENIED_MESSAGE };
  }

  const projectId = formData.get("projectId");
  if (typeof projectId !== "string" || !projectId) {
    return { error: "Project not found." };
  }

  const parsed = addProjectMemberSchema.safeParse({
    userId: formData.get("userId"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const result = await addProjectMemberRecord({
    projectId,
    organizationId: organization.id,
    userId: parsed.data.userId,
    role: parsed.data.role,
  });

  if (!result.ok) {
    return { error: result.error };
  }

  revalidatePath(`/dashboard/projects/${projectId}`);
  return { success: true };
}

export async function removeProjectMember(
  _prevState: ProjectMemberActionState,
  formData: FormData
): Promise<ProjectMemberActionState> {
  const { organization, role } = await requireOrgContext();

  if (!can(role, "projects:manageMembers")) {
    return { error: PERMISSION_DENIED_MESSAGE };
  }

  const projectId = formData.get("projectId");
  if (typeof projectId !== "string" || !projectId) {
    return { error: "Project not found." };
  }

  const parsed = removeProjectMemberSchema.safeParse({
    membershipId: formData.get("membershipId"),
  });
  if (!parsed.success) {
    return { error: "Invalid input." };
  }

  const removed = await removeProjectMemberRecord(
    parsed.data.membershipId,
    projectId,
    organization.id
  );

  if (!removed) {
    return { error: "Member not found on this project." };
  }

  revalidatePath(`/dashboard/projects/${projectId}`);
  return { success: true };
}
