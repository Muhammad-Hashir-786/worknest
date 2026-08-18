"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "~/lib/auth/current-user";
import { requireOrgContext } from "~/lib/auth/current-org";
import { can } from "~/lib/permissions/permissions";
import { createJoinRequest, findOrganizationByName, reviewJoinRequest } from "~/services/join-request";
import { createNotification } from "~/services/notification";
import { getOrganizationMembers } from "~/services/organization";
import { logActivity } from "~/services/activity";

export type JoinRequestActionState = { error?: string; success?: string };

export async function submitJoinRequest(_prev: JoinRequestActionState, formData: FormData): Promise<JoinRequestActionState> {
  const user = await getCurrentUser(); if (!user) return { error: "Please sign in first." };
  const name = formData.get("organizationName"), message = formData.get("message");
  if (typeof name !== "string" || name.trim().length < 2) return { error: "Enter the organization name." };
  const organization = await findOrganizationByName(name); if (!organization) return { error: "We could not find that organization. Ask an owner for an invitation link." };
  const result = await createJoinRequest(user.id, organization._id.toString(), typeof message === "string" ? message : "");
  if (!result.ok) return { error: result.error };
  const members = await getOrganizationMembers(organization._id.toString());
  await Promise.all(members.filter((member) => member.role === "owner" || member.role === "admin").map((member) => createNotification({ userId: member.user.id, organizationId: organization._id.toString(), type: "general", message: `${user.name} requested to join ${organization.name}.`, }))); 
  revalidatePath("/onboarding/join");
  return { success: `Request sent to ${organization.name}. An owner or admin will review it.` };
}

export async function reviewJoinRequestAction(_prev: JoinRequestActionState, formData: FormData): Promise<JoinRequestActionState> {
  const { organization, role, user } = await requireOrgContext();
  if (!can(role, "members:invite")) return { error: "Only owners and admins can review join requests." };
  const requestId = formData.get("requestId"), decision = formData.get("decision");
  if (typeof requestId !== "string" || (decision !== "approved" && decision !== "rejected")) return { error: "Invalid review request." };
  const result = await reviewJoinRequest(requestId, organization.id, user.id, decision);
  if (!result.ok) return { error: result.error };
  await createNotification({ userId: result.userId, organizationId: organization.id, type: "general", message: decision === "approved" ? `Your request to join ${organization.name} was approved.` : `Your request to join ${organization.name} was declined.` });
  await logActivity({ organizationId: organization.id, userId: user.id, action: decision === "approved" ? "created" : "updated", entityType: "User", entityId: result.userId, metadata: { event: decision === "approved" ? "join_request_approved" : "join_request_rejected" } });
  revalidatePath("/dashboard/settings/team"); revalidatePath("/onboarding/join");
  return { success: decision === "approved" ? "Member approved." : "Request declined." };
}
