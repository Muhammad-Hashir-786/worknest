"use server";

import { revalidatePath } from "next/cache";
import { requireOrgContext } from "~/lib/auth/current-org";
import { can, PERMISSION_DENIED_MESSAGE } from "~/lib/permissions/permissions";
import { createMilestone, toggleMilestone, reorderMilestone } from "~/services/milestone";
import { createSavedView, deleteSavedView } from "~/services/saved-view";
import { createTaskTemplate } from "~/services/task-template";
import { PRIORITY } from "~/lib/constants/roles";

export interface PlanningActionState { error?: string; success?: boolean; }
const recurrence = ["none", "daily", "weekly", "monthly"] as const;

export async function createMilestoneAction(_state: PlanningActionState, formData: FormData): Promise<PlanningActionState> {
  const { organization, role } = await requireOrgContext();
  if (!can(role, "projects:update")) return { error: PERMISSION_DENIED_MESSAGE };
  const projectId = formData.get("projectId"); const title = formData.get("title"); const dueDate = formData.get("dueDate");
  if (typeof projectId !== "string" || typeof title !== "string" || !title.trim() || typeof dueDate !== "string" || Number.isNaN(Date.parse(dueDate))) return { error: "Enter a milestone name and valid date." };
  if (!(await createMilestone(projectId, organization.id, title.trim(), new Date(dueDate)))) return { error: "Project not found." };
  revalidatePath(`/dashboard/projects/${projectId}`); return { success: true };
}

export async function toggleMilestoneAction(formData: FormData): Promise<void> {
  const { organization, role } = await requireOrgContext();
  if (!can(role, "projects:update")) return;
  const id = formData.get("milestoneId"); const projectId = formData.get("projectId"); const completed = formData.get("completed");
  if (typeof id !== "string" || typeof projectId !== "string" || (completed !== "true" && completed !== "false")) return;
  await toggleMilestone(id, projectId, organization.id, completed === "true"); revalidatePath(`/dashboard/projects/${projectId}`);
}

export async function reorderMilestoneAction(formData: FormData): Promise<void> {
  const { organization, role } = await requireOrgContext();
  if (!can(role, "projects:update")) return;
  const id = formData.get("milestoneId"); const projectId = formData.get("projectId"); const targetIndex = Number(formData.get("targetIndex"));
  if (typeof id !== "string" || typeof projectId !== "string" || !Number.isInteger(targetIndex)) return;
  await reorderMilestone(id, projectId, organization.id, targetIndex);
  revalidatePath(`/dashboard/projects/${projectId}`);
}

export async function saveViewAction(_state: PlanningActionState, formData: FormData): Promise<PlanningActionState> {
  const { organization, user } = await requireOrgContext();
  const name = formData.get("name"); const projectId = formData.get("projectId"); const view = formData.get("view"); const filtersJson = formData.get("filters");
  if (typeof name !== "string" || !name.trim() || typeof projectId !== "string" || !["list", "board", "calendar"].includes(String(view)) || typeof filtersJson !== "string") return { error: "Enter a name for this view." };
  try { const filters = JSON.parse(filtersJson); await createSavedView(organization.id, projectId, user.id, name.trim(), view as "list" | "board" | "calendar", filters); } catch { return { error: "Could not save this view." }; }
  revalidatePath(`/dashboard/projects/${projectId}/tasks`); return { success: true };
}

export async function deleteSavedViewAction(formData: FormData): Promise<void> {
  const { organization, user } = await requireOrgContext(); const id = formData.get("id"); const projectId = formData.get("projectId");
  if (typeof id !== "string" || typeof projectId !== "string") return;
  await deleteSavedView(id, organization.id, projectId, user.id); revalidatePath(`/dashboard/projects/${projectId}/tasks`);
}

export async function createTaskTemplateAction(_state: PlanningActionState, formData: FormData): Promise<PlanningActionState> {
  const { organization, user, role } = await requireOrgContext();
  if (!can(role, "tasks:create")) return { error: PERMISSION_DENIED_MESSAGE };
  const projectId = formData.get("projectId"), name = formData.get("name"), title = formData.get("title"), description = formData.get("description"), priority = formData.get("priority"), estimatedHours = formData.get("estimatedHours"), recurrenceValue = formData.get("recurrence");
  if (typeof projectId !== "string" || typeof name !== "string" || !name.trim() || typeof title !== "string" || !title.trim() || typeof description !== "string" || !PRIORITY.includes(priority as typeof PRIORITY[number]) || !recurrence.includes(recurrenceValue as typeof recurrence[number])) return { error: "Complete the template details." };
  const hours = typeof estimatedHours === "string" && estimatedHours ? Number(estimatedHours) : undefined;
  if (hours !== undefined && (!Number.isFinite(hours) || hours < 0)) return { error: "Enter valid estimated hours." };
  await createTaskTemplate({ organizationId: organization.id, projectId, userId: user.id, name: name.trim(), title: title.trim(), description, priority: priority as typeof PRIORITY[number], estimatedHours: hours, recurrence: recurrenceValue as typeof recurrence[number] });
  revalidatePath(`/dashboard/projects/${projectId}/tasks/new`); return { success: true };
}
