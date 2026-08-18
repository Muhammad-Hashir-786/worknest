"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireOrgContext } from "../lib/auth/current-org";
import { can, PERMISSION_DENIED_MESSAGE } from "../lib/permissions/permissions";
import {
  createTaskSchema,
  updateTaskSchema,
  changeTaskStatusSchema,
  createSubtaskSchema,
  toggleSubtaskSchema,
  deleteSubtaskSchema,
  moveSubtaskSchema,
} from "../lib/validations/task";
import { getProjectForOrg } from "../services/project";
import {
  getTaskForOrg,
  createTask as createTaskRecord,
  updateTask as updateTaskRecord,
  changeTaskStatus as changeTaskStatusRecord,
  deleteTask as deleteTaskRecord,
  createSubtask as createSubtaskRecord,
  toggleSubtask as toggleSubtaskRecord,
  deleteSubtask as deleteSubtaskRecord,
  moveSubtask as moveSubtaskRecord,
  reorderSubtask as reorderSubtaskRecord,
  isValidAssignee,
  areValidDependencies,
  createNextRecurringTask,
} from "~/services/task";
import { logActivity } from "~/services/activity";
import { createNotification } from "~/services/notification";

export interface TaskActionState {
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

function parseDependencies(value: FormDataEntryValue | null | undefined): string[] {
  if (typeof value !== "string" || !value.trim()) return [];
  return [...new Set(value.split(",").map((id) => id.trim()).filter(Boolean))];
}

export async function createTask(
  _prevState: TaskActionState,
  formData: FormData
): Promise<TaskActionState> {
  const { organization, role, user } = await requireOrgContext();

  if (!can(role, "tasks:create")) {
    return { error: PERMISSION_DENIED_MESSAGE };
  }

  const projectId = formData.get("projectId");
  if (typeof projectId !== "string" || !projectId) {
    return { error: "Project not found." };
  }

  // Confirms the project belongs to the caller's organization before a
  // task can be attached to it - the same rule as every other
  // cross-entity reference in the app.
  const project = await getProjectForOrg(projectId, organization.id);
  if (!project) {
    return { error: "Project not found." };
  }

  const parsed = createTaskSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    priority: formData.get("priority"),
    assignee: formData.get("assignee"),
    dueDate: formData.get("dueDate"),
    estimatedHours: formData.get("estimatedHours"),
    recurrence: formData.get("recurrence"),
    recurrenceEndDate: formData.get("recurrenceEndDate"),
    dependsOn: formData.getAll("dependsOn").join(","),
  });

  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }

  const data = parsed.data;

  if (!(await isValidAssignee(data.assignee || undefined, projectId))) {
    return { fieldErrors: { assignee: "Select a member of this project." } };
  }
  const dependencies = parseDependencies(data.dependsOn);
  if (!(await areValidDependencies(undefined, projectId, organization.id, dependencies))) {
    return { fieldErrors: { dependsOn: "Dependencies must be other tasks in this project." } };
  }

  const task = await createTaskRecord({
    projectId,
    organizationId: organization.id,
    createdBy: user.id,
    title: data.title,
    description: data.description ?? "",
    priority: data.priority,
    assignee: data.assignee || undefined,
    dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
    estimatedHours: data.estimatedHours ? Number(data.estimatedHours) : undefined,
    recurrence: data.recurrence,
    recurrenceEndDate: data.recurrenceEndDate ? new Date(data.recurrenceEndDate) : undefined,
    dependsOn: dependencies,
  });

  await logActivity({ organizationId: organization.id, userId: user.id, action: "created", entityType: "Task", entityId: task.id, metadata: { title: data.title } });
  if (data.assignee && data.assignee !== user.id) {
    await createNotification({ userId: data.assignee, organizationId: organization.id, type: "task_assigned", message: `You were assigned “${data.title}”.`, relatedTaskId: task.id, relatedProjectId: projectId });
  }

  revalidatePath(`/dashboard/projects/${projectId}/tasks`);
  redirect(`/dashboard/projects/${projectId}/tasks/${task.id}`);
}

/**
 * Full task edit, bound to the task detail page's form. Two authorization
 * paths, mirroring the resource-ownership note in lib/permissions/permissions.ts:
 *   - manager/admin/owner (tasks:assign): can edit any task in the org,
 *     including reassigning it.
 *   - member (tasks:update only): can edit a task ONLY if it's currently
 *     assigned to them, and cannot change who it's assigned to - that
 *     reassignment right is what tasks:assign specifically gates.
 */
export async function updateTask(
  _prevState: TaskActionState,
  formData: FormData
): Promise<TaskActionState> {
  const { organization, role, user } = await requireOrgContext();

  const taskId = formData.get("taskId");
  if (typeof taskId !== "string" || !taskId) {
    return { error: "Task not found." };
  }

  const task = await getTaskForOrg(taskId, organization.id);
  if (!task) {
    return { error: "Task not found." };
  }

  const canManageAnyTask = can(role, "tasks:assign");
  const isOwnTask = task.assignee?.id === user.id;

  if (!canManageAnyTask && !(can(role, "tasks:update") && isOwnTask)) {
    return { error: PERMISSION_DENIED_MESSAGE };
  }

  const parsed = updateTaskSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    status: formData.get("status"),
    priority: formData.get("priority"),
    assignee: formData.get("assignee"),
    dueDate: formData.get("dueDate"),
    estimatedHours: formData.get("estimatedHours"),
    recurrence: formData.get("recurrence"),
    recurrenceEndDate: formData.get("recurrenceEndDate"),
    dependsOn: formData.getAll("dependsOn").join(","),
  });

  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }

  const data = parsed.data;
  const dependencies = parseDependencies(data.dependsOn);
  if (!(await areValidDependencies(taskId, task.projectId, organization.id, dependencies))) {
    return { fieldErrors: { dependsOn: "Dependencies must be other tasks in this project." } };
  }

  // Members can't reassign - keep whatever the task already had regardless
  // of what the (disabled, but never trust the client) form field contains.
  let assigneeId = task.assignee?.id ?? "";
  if (canManageAnyTask) {
    assigneeId = data.assignee ?? "";
    if (!(await isValidAssignee(assigneeId || undefined, task.projectId))) {
      return { fieldErrors: { assignee: "Select a member of this project." } };
    }
  }

  const updated = await updateTaskRecord(taskId, organization.id, {
    title: data.title,
    description: data.description ?? "",
    status: data.status,
    priority: data.priority,
    assignee: assigneeId || undefined,
    dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
    estimatedHours: data.estimatedHours ? Number(data.estimatedHours) : undefined,
    recurrence: data.recurrence,
    recurrenceEndDate: data.recurrenceEndDate ? new Date(data.recurrenceEndDate) : undefined,
    dependsOn: dependencies,
  });

  if (!updated) {
    return { error: "Task not found." };
  }

  if (parsed.data.status === "completed") await createNextRecurringTask(taskId, organization.id);

  await logActivity({ organizationId: organization.id, userId: user.id, action: "updated", entityType: "Task", entityId: taskId, metadata: { title: data.title } });
  if (canManageAnyTask && assigneeId && assigneeId !== task.assignee?.id && assigneeId !== user.id) {
    await createNotification({ userId: assigneeId, organizationId: organization.id, type: "task_assigned", message: `You were assigned “${data.title}”.`, relatedTaskId: taskId, relatedProjectId: task.projectId });
  }

  revalidatePath(`/dashboard/projects/${task.projectId}/tasks/${taskId}`);
  revalidatePath(`/dashboard/projects/${task.projectId}/tasks`);
  return { success: true };
}

/**
 * Lightweight status-only update, bound to the status dropdown on the task
 * list and detail views. Kept separate from the full edit form so changing
 * status - the single most common task action - never requires opening a
 * full edit form, for either managers or the task's assignee.
 */
export async function changeTaskStatus(
  _prevState: TaskActionState,
  formData: FormData
): Promise<TaskActionState> {
  const { organization, role, user } = await requireOrgContext();

  const taskId = formData.get("taskId");
  const projectId = formData.get("projectId");
  if (typeof taskId !== "string" || !taskId || typeof projectId !== "string" || !projectId) {
    return { error: "Task not found." };
  }

  if (!can(role, "tasks:update")) {
    return { error: PERMISSION_DENIED_MESSAGE };
  }

  const parsed = changeTaskStatusSchema.safeParse({ status: formData.get("status") });
  if (!parsed.success) {
    return { error: "Invalid status." };
  }

  // Managers/admins/owners can change any task's status; members are
  // restricted (via the query filter itself) to tasks assigned to them.
  const restrictToAssignee = can(role, "tasks:assign") ? undefined : user.id;
  const task = await getTaskForOrg(taskId, organization.id);
  if (!task || task.projectId !== projectId) return { error: "Task not found." };

  const updated = await changeTaskStatusRecord(
    taskId,
    organization.id,
    parsed.data.status,
    restrictToAssignee
  );

  if (!updated) {
    return { error: "Task not found, or it isn't assigned to you." };
  }

  if (parsed.data.status === "completed") await createNextRecurringTask(taskId, organization.id);

  await logActivity({ organizationId: organization.id, userId: user.id, action: "status_changed", entityType: "Task", entityId: taskId, metadata: { status: parsed.data.status } });
  if (task.assignee && task.assignee.id !== user.id) {
    await createNotification({ userId: task.assignee.id, organizationId: organization.id, type: "status_change", message: `“${task.title}” is now ${parsed.data.status.replace("_", " ")}.`, relatedTaskId: taskId, relatedProjectId: projectId });
  }

  revalidatePath(`/dashboard/projects/${projectId}/tasks/${taskId}`);
  revalidatePath(`/dashboard/projects/${projectId}/tasks`);
  return { success: true };
}

export async function deleteTask(formData: FormData): Promise<void> {
  const { organization, role, user } = await requireOrgContext();

  const taskId = formData.get("taskId");
  const projectId = formData.get("projectId");
  if (typeof taskId !== "string" || !taskId || typeof projectId !== "string" || !projectId) {
    redirect("/dashboard/projects");
  }

  if (!can(role, "tasks:delete")) {
    redirect(`/dashboard/projects/${projectId}/tasks/${taskId}`);
  }

  const task = await getTaskForOrg(taskId, organization.id);
  await deleteTaskRecord(taskId, organization.id);
  if (task) await logActivity({ organizationId: organization.id, userId: user.id, action: "deleted", entityType: "Task", entityId: taskId, metadata: { title: task.title } });

  revalidatePath(`/dashboard/projects/${projectId}/tasks`);
  redirect(`/dashboard/projects/${projectId}/tasks`);
}

// --- Subtasks --------------------------------------------------------------
// Subtasks inherit their parent task's authorization: anyone who could
// update the task (manager+/admin/owner, or the assignee) can manage its
// subtasks. There's no separate "subtasks:*" permission - a checklist item
// isn't a meaningful enough unit of access to warrant its own permission.

async function canManageTaskSubtasks(
  taskId: string,
  organizationId: string,
  role: import("~/lib/constants/roles").OrgRole,
  userId: string
): Promise<{ ok: true; projectId: string } | { ok: false; error: string }> {
  const task = await getTaskForOrg(taskId, organizationId);
  if (!task) return { ok: false, error: "Task not found." };

  const canManageAnyTask = can(role, "tasks:assign");
  const isOwnTask = task.assignee?.id === userId;

  if (!canManageAnyTask && !(can(role, "tasks:update") && isOwnTask)) {
    return { ok: false, error: PERMISSION_DENIED_MESSAGE };
  }

  return { ok: true, projectId: task.projectId };
}

export async function createSubtask(
  _prevState: TaskActionState,
  formData: FormData
): Promise<TaskActionState> {
  const { organization, role, user } = await requireOrgContext();

  const taskId = formData.get("taskId");
  if (typeof taskId !== "string" || !taskId) {
    return { error: "Task not found." };
  }

  const authz = await canManageTaskSubtasks(taskId, organization.id, role, user.id);
  if (!authz.ok) return { error: authz.error };

  const parsed = createSubtaskSchema.safeParse({ title: formData.get("title") });
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }

  const result = await createSubtaskRecord(taskId, organization.id, parsed.data.title);
  if (!result.ok) {
    return { error: "Task not found." };
  }

  revalidatePath(`/dashboard/projects/${authz.projectId}/tasks/${taskId}`);
  return { success: true };
}

export async function toggleSubtask(
  _prevState: TaskActionState,
  formData: FormData
): Promise<TaskActionState> {
  const { organization, role, user } = await requireOrgContext();

  const taskId = formData.get("taskId");
  if (typeof taskId !== "string" || !taskId) {
    return { error: "Task not found." };
  }

  const authz = await canManageTaskSubtasks(taskId, organization.id, role, user.id);
  if (!authz.ok) return { error: authz.error };

  const parsed = toggleSubtaskSchema.safeParse({
    subtaskId: formData.get("subtaskId"),
    completed: formData.get("completed"),
  });
  if (!parsed.success) {
    return { error: "Invalid input." };
  }

  const updated = await toggleSubtaskRecord(
    parsed.data.subtaskId,
    taskId,
    organization.id,
    parsed.data.completed === "true"
  );
  if (!updated) {
    return { error: "Subtask not found." };
  }

  revalidatePath(`/dashboard/projects/${authz.projectId}/tasks/${taskId}`);
  return { success: true };
}

export async function deleteSubtask(
  _prevState: TaskActionState,
  formData: FormData
): Promise<TaskActionState> {
  const { organization, role, user } = await requireOrgContext();

  const taskId = formData.get("taskId");
  if (typeof taskId !== "string" || !taskId) {
    return { error: "Task not found." };
  }

  const authz = await canManageTaskSubtasks(taskId, organization.id, role, user.id);
  if (!authz.ok) return { error: authz.error };

  const parsed = deleteSubtaskSchema.safeParse({ subtaskId: formData.get("subtaskId") });
  if (!parsed.success) {
    return { error: "Invalid input." };
  }

  const deleted = await deleteSubtaskRecord(parsed.data.subtaskId, taskId, organization.id);
  if (!deleted) {
    return { error: "Subtask not found." };
  }

  revalidatePath(`/dashboard/projects/${authz.projectId}/tasks/${taskId}`);
  return { success: true };
}

export async function moveSubtask(
  _prevState: TaskActionState,
  formData: FormData
): Promise<TaskActionState> {
  const { organization, role, user } = await requireOrgContext();

  const taskId = formData.get("taskId");
  if (typeof taskId !== "string" || !taskId) {
    return { error: "Task not found." };
  }

  const authz = await canManageTaskSubtasks(taskId, organization.id, role, user.id);
  if (!authz.ok) return { error: authz.error };

  const parsed = moveSubtaskSchema.safeParse({
    subtaskId: formData.get("subtaskId"),
    direction: formData.get("direction"),
  });
  if (!parsed.success) {
    return { error: "Invalid input." };
  }

  await moveSubtaskRecord(parsed.data.subtaskId, taskId, organization.id, parsed.data.direction);

  revalidatePath(`/dashboard/projects/${authz.projectId}/tasks/${taskId}`);
  return { success: true };
}

export async function reorderSubtask(
  _prevState: TaskActionState,
  formData: FormData
): Promise<TaskActionState> {
  const { organization, role, user } = await requireOrgContext();
  const taskId = formData.get("taskId");
  const subtaskId = formData.get("subtaskId");
  const targetIndex = Number(formData.get("targetIndex"));
  if (typeof taskId !== "string" || typeof subtaskId !== "string" || !Number.isInteger(targetIndex)) return { error: "Invalid subtask." };
  const authz = await canManageTaskSubtasks(taskId, organization.id, role, user.id);
  if (!authz.ok) return { error: authz.error };
  const moved = await reorderSubtaskRecord(subtaskId, taskId, organization.id, targetIndex);
  if (!moved) return { error: "Subtask not found." };
  revalidatePath(`/dashboard/projects/${authz.projectId}/tasks/${taskId}`);
  return { success: true };
}
