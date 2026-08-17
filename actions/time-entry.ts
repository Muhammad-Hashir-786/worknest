"use server";

import { revalidatePath } from "next/cache";
import { requireOrgContext } from "~/lib/auth/current-org";
import { can, PERMISSION_DENIED_MESSAGE } from "~/lib/permissions/permissions";
import { getTaskForOrg } from "~/services/task";
import { startTimer as startTimerRecord, stopTimer as stopTimerRecord } from "~/services/time-entry";

export interface TimeEntryActionState { error?: string; success?: boolean; }

function ids(formData: FormData) {
  const taskId = formData.get("taskId");
  const projectId = formData.get("projectId");
  return typeof taskId === "string" && typeof projectId === "string" ? { taskId, projectId } : null;
}

export async function startTimer(_state: TimeEntryActionState, formData: FormData): Promise<TimeEntryActionState> {
  const { organization, role, user } = await requireOrgContext();
  const values = ids(formData);
  if (!values) return { error: "Task not found." };
  const task = await getTaskForOrg(values.taskId, organization.id);
  if (!task || task.projectId !== values.projectId) return { error: "Task not found." };
  if (!can(role, "tasks:trackTime") || (!can(role, "tasks:assign") && task.assignee?.id !== user.id)) {
    return { error: PERMISSION_DENIED_MESSAGE };
  }
  const result = await startTimerRecord(values.taskId, organization.id, user.id);
  if (!result.ok) return { error: result.error };
  revalidatePath(`/dashboard/projects/${values.projectId}/tasks/${values.taskId}`);
  return { success: true };
}

export async function stopTimer(_state: TimeEntryActionState, formData: FormData): Promise<TimeEntryActionState> {
  const { organization, user } = await requireOrgContext();
  const values = ids(formData);
  const entryId = formData.get("entryId");
  if (!values || typeof entryId !== "string") return { error: "Time entry not found." };
  const result = await stopTimerRecord(entryId, values.taskId, organization.id, user.id);
  if (!result.ok) return { error: result.error };
  revalidatePath(`/dashboard/projects/${values.projectId}/tasks/${values.taskId}`);
  return { success: true };
}
