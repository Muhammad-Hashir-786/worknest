"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireOrgContext } from "~/lib/auth/current-org";
import { can, PERMISSION_DENIED_MESSAGE } from "~/lib/permissions/permissions";
import { clientSchema } from "~/lib/validations/client";
import {
  createClient as createClientRecord,
  updateClient as updateClientRecord,
  deleteClient as deleteClientRecord,
  getClientForOrg,
} from "~/services/client";
import { logActivity } from "~/services/activity";

export interface ClientActionState {
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

export async function createClient(
  _prevState: ClientActionState,
  formData: FormData
): Promise<ClientActionState> {
  const { user, organization, role } = await requireOrgContext();

  if (!can(role, "clients:manage")) {
    return { error: PERMISSION_DENIED_MESSAGE };
  }

  const parsed = clientSchema.safeParse({
    name: formData.get("name"),
    company: formData.get("company"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }

  const data = parsed.data;

  const client = await createClientRecord({
    organizationId: organization.id,
    name: data.name,
    company: data.company,
    email: data.email,
    phone: data.phone,
    notes: data.notes,
  });

  await logActivity({
    organizationId: organization.id,
    userId: user.id,
    action: "created",
    entityType: "Client",
    entityId: client.id,
    metadata: { name: data.name },
  });

  revalidatePath("/dashboard/clients");
  redirect(`/dashboard/clients/${client.id}`);
}

export async function updateClient(
  _prevState: ClientActionState,
  formData: FormData
): Promise<ClientActionState> {
  const { user, organization, role } = await requireOrgContext();

  if (!can(role, "clients:manage")) {
    return { error: PERMISSION_DENIED_MESSAGE };
  }

  const clientId = formData.get("clientId");
  if (typeof clientId !== "string" || !clientId) {
    return { error: "Client not found." };
  }

  const parsed = clientSchema.safeParse({
    name: formData.get("name"),
    company: formData.get("company"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }

  const data = parsed.data;

  // organization.id comes from the verified session context, never from
  // the form - updateClient's own query is additionally scoped to it, so
  // there is no way to post another organization's clientId and edit it.
  const updated = await updateClientRecord(clientId, organization.id, {
    name: data.name,
    company: data.company ?? "",
    email: data.email ?? "",
    phone: data.phone ?? "",
    notes: data.notes ?? "",
  });

  if (!updated) {
    return { error: "Client not found." };
  }

  await logActivity({
    organizationId: organization.id,
    userId: user.id,
    action: "updated",
    entityType: "Client",
    entityId: clientId,
    metadata: { name: data.name },
  });

  revalidatePath(`/dashboard/clients/${clientId}`);
  revalidatePath("/dashboard/clients");
  return { success: true };
}

/**
 * Bound directly to a <form action={deleteClient}> (with a hidden
 * clientId field) - same fire-and-forget, no-useActionState shape as
 * deleteProject in actions/project.ts. Since there's no field to re-render
 * an error against, a rejection (no permission, client still has projects)
 * redirects back to the client page instead - the detail page doesn't show
 * the delete button/section at all unless canDelete is true, and the
 * "still has projects" case is rare enough that a plain redirect-back is
 * an acceptable outcome; the error is logged server-side rather than shown.
 */
export async function deleteClient(formData: FormData): Promise<void> {
  const { user, organization, role } = await requireOrgContext();

  const clientId = formData.get("clientId");
  if (typeof clientId !== "string" || !clientId) {
    redirect("/dashboard/clients");
  }

  if (!can(role, "clients:manage")) {
    redirect(`/dashboard/clients/${clientId}`);
  }

  const client = await getClientForOrg(clientId, organization.id);
  if (!client) {
    redirect("/dashboard/clients");
  }

  const result = await deleteClientRecord(clientId, organization.id);

  if (result.ok) {
    // Captured the client's name above, before deletion, since the record
    // (and any name lookup against it) won't exist once this resolves.
    await logActivity({
      organizationId: organization.id,
      userId: user.id,
      action: "deleted",
      entityType: "Client",
      entityId: clientId,
      metadata: { name: client.name },
    });
  }

  revalidatePath("/dashboard/clients");

  if (!result.ok) {
    redirect(`/dashboard/clients/${clientId}?error=${encodeURIComponent(result.error)}`);
  }

  redirect("/dashboard/clients");
}
