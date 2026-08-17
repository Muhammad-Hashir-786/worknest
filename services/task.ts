import "server-only";
import { isValidObjectId } from "mongoose";
import connectDB from "../lib/db";
import Task from "../models/tasks";
import "../models/user";
import Subtask from "../models/sub_task";
import ProjectMember from "../models/project_members";
import Comment from "../models/comments";
import Attachment from "../models/attachment";
import TimeEntry from "../models/time_entry";
import Notification from "../models/notifications";
import { escapeRegExp } from "../lib/utils/text";
import { deleteFileByKey } from "./storage";
import type { TaskStatus, Priority } from "../lib/constants/roles";

export interface TaskFilters {
  status?: TaskStatus;
  priority?: Priority;
  // A real user id, or undefined for "everyone". The "me" sentinel from the
  // URL is resolved to a concrete id by the caller (the page) before this
  // is called, since this layer has no access to the current session.
  assigneeId?: string;
  search?: string;
}

interface AssigneeRef {
  id: string;
  name: string;
  avatar: string;
}

export interface TaskSummary {
  id: string;
  title: string;
  status: TaskStatus;
  priority: Priority;
  dueDate: Date | null;
  assignee: AssigneeRef | null;
  subtaskTotal: number;
  subtaskCompleted: number;
  // Computed here rather than in the card component - see the identical
  // note on ProjectSummary.isOverdue in services/project.ts.
  isOverdue: boolean;
  recurrence: "none" | "daily" | "weekly" | "monthly";
}

function computeIsOverdue(status: TaskStatus, dueDate: Date | null): boolean {
  return status !== "completed" && dueDate !== null && dueDate.getTime() < Date.now();
}

function toAssigneeRef(assignee: unknown): AssigneeRef | null {
  if (!assignee || typeof assignee !== "object") return null;
  const a = assignee as { _id: { toString(): string }; name: string; avatar: string };
  return { id: a._id.toString(), name: a.name, avatar: a.avatar };
}

/**
 * Every task belonging to a project, scoped by BOTH project and
 * organization (not project alone) - the same defense-in-depth the project
 * service applies. The page calling this has already confirmed the project
 * itself belongs to the caller's organization, but a query that could
 * theoretically match another org's data if the project check were ever
 * skipped is a bug waiting to happen, so the organization filter stays.
 */
export async function getTasksForProject(
  projectId: string,
  organizationId: string,
  filters: TaskFilters = {}
): Promise<TaskSummary[]> {
  await connectDB();

  const query: Record<string, unknown> = { project: projectId, organization: organizationId };
  if (filters.status) query.status = filters.status;
  if (filters.priority) query.priority = filters.priority;
  if (filters.assigneeId) {
    query.assignee = filters.assigneeId === "unassigned" ? null : filters.assigneeId;
  }
  if (filters.search) {
    query.title = { $regex: escapeRegExp(filters.search), $options: "i" };
  }

  const tasks = await Task.find(query)
    .populate("assignee", "name avatar")
    .sort({ createdAt: -1 })
    .lean();

  if (tasks.length === 0) return [];

  const subtaskCounts = await Subtask.aggregate<{
    _id: unknown;
    total: number;
    completed: number;
  }>([
    { $match: { task: { $in: tasks.map((t) => t._id) } } },
    {
      $group: {
        _id: "$task",
        total: { $sum: 1 },
        completed: { $sum: { $cond: ["$completed", 1, 0] } },
      },
    },
  ]);
  const countByTaskId = new Map(subtaskCounts.map((row) => [String(row._id), row]));

  return tasks.map((task) => {
    const counts = countByTaskId.get(task._id.toString());
    const dueDate = task.dueDate ?? null;
    return {
      id: task._id.toString(),
      title: task.title,
      status: task.status as TaskStatus,
      priority: task.priority as Priority,
      dueDate,
      assignee: toAssigneeRef(task.assignee),
      subtaskTotal: counts?.total ?? 0,
      subtaskCompleted: counts?.completed ?? 0,
      isOverdue: computeIsOverdue(task.status as TaskStatus, dueDate),
      recurrence: (task.recurrence ?? "none") as TaskSummary["recurrence"],
    };
  });
}

export interface TaskDetail {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  dueDate: Date | null;
  estimatedHours: number | null;
  assignee: AssigneeRef | null;
  createdBy: { id: string; name: string } | null;
  createdAt: Date;
  recurrence: "none" | "daily" | "weekly" | "monthly";
  recurrenceEndDate: Date | null;
  dependsOn: { id: string; title: string; status: TaskStatus }[];
}

/**
 * Loads one task, but only if it belongs to `organizationId` - the same
 * "never bare-findById" rule as getProjectForOrg. Task.organization is a
 * denormalized copy of its project's organization (kept in sync by a
 * pre-save hook on the Task model), so this is a single-collection query
 * rather than a join through Project.
 */
export async function getTaskForOrg(
  taskId: string,
  organizationId: string
): Promise<TaskDetail | null> {
  if (!isValidObjectId(taskId)) return null;

  await connectDB();

  const task = await Task.findOne({ _id: taskId, organization: organizationId })
    .populate("assignee", "name avatar")
    .populate("createdBy", "name")
    .populate("dependsOn", "title status")
    .lean();

  if (!task) return null;

  const createdBy = task.createdBy as unknown as
    | { _id: { toString(): string }; name: string }
    | null;

  return {
    id: task._id.toString(),
    projectId: task.project.toString(),
    title: task.title,
    description: task.description ?? "",
    status: task.status as TaskStatus,
    priority: task.priority as Priority,
    dueDate: task.dueDate ?? null,
    estimatedHours: task.estimatedHours ?? null,
    assignee: toAssigneeRef(task.assignee),
    createdBy: createdBy ? { id: createdBy._id.toString(), name: createdBy.name } : null,
    createdAt: task.createdAt,
    recurrence: (task.recurrence ?? "none") as TaskDetail["recurrence"],
    recurrenceEndDate: task.recurrenceEndDate ?? null,
    dependsOn: ((task.dependsOn ?? []) as unknown as { _id: { toString(): string }; title: string; status: TaskStatus }[]).map((dependency) => ({ id: dependency._id.toString(), title: dependency.title, status: dependency.status })),
  };
}

/**
 * Assignee must already be a member of the project being assigned to - a
 * task can never be handed to someone who isn't even on the project, even
 * if they're a member of the wider organization. Returns true for the
 * "unassigned" case (empty id).
 */
async function isValidAssignee(assigneeId: string | undefined, projectId: string): Promise<boolean> {
  if (!assigneeId) return true;
  if (!isValidObjectId(assigneeId)) return false;
  const member = await ProjectMember.exists({ project: projectId, user: assigneeId });
  return Boolean(member);
}

export { isValidAssignee };

export async function createTask(params: {
  projectId: string;
  organizationId: string;
  createdBy: string;
  title: string;
  description: string;
  priority: Priority;
  assignee?: string;
  dueDate?: Date;
  estimatedHours?: number;
  recurrence?: "none" | "daily" | "weekly" | "monthly";
  recurrenceEndDate?: Date;
  dependsOn?: string[];
}): Promise<{ id: string }> {
  await connectDB();

  const task = await Task.create({
    project: params.projectId,
    organization: params.organizationId,
    title: params.title,
    description: params.description,
    status: "todo",
    priority: params.priority,
    assignee: params.assignee || undefined,
    createdBy: params.createdBy,
    dueDate: params.dueDate,
    estimatedHours: params.estimatedHours,
    recurrence: params.recurrence ?? "none",
    recurrenceEndDate: params.recurrenceEndDate,
    dependsOn: params.dependsOn ?? [],
  });

  return { id: task._id.toString() };
}

export async function updateTask(
  taskId: string,
  organizationId: string,
  data: {
    title: string;
    description: string;
    status: TaskStatus;
    priority: Priority;
    assignee?: string;
    dueDate?: Date;
    estimatedHours?: number;
    recurrence: "none" | "daily" | "weekly" | "monthly";
    recurrenceEndDate?: Date;
    dependsOn: string[];
  }
): Promise<boolean> {
  if (!isValidObjectId(taskId)) return false;

  await connectDB();

  const result = await Task.findOneAndUpdate(
    { _id: taskId, organization: organizationId },
    {
      title: data.title,
      description: data.description,
      status: data.status,
      priority: data.priority,
      assignee: data.assignee || null,
      dueDate: data.dueDate ?? null,
      estimatedHours: data.estimatedHours ?? null,
      recurrence: data.recurrence,
      recurrenceEndDate: data.recurrenceEndDate ?? null,
      dependsOn: data.dependsOn,
    }
  );

  return Boolean(result);
}

export async function changeTaskStatus(
  taskId: string,
  organizationId: string,
  status: TaskStatus,
  restrictToAssignee?: string
): Promise<boolean> {
  if (!isValidObjectId(taskId)) return false;

  await connectDB();

  const filter: Record<string, unknown> = { _id: taskId, organization: organizationId };
  // Members are only allowed to change the status of tasks assigned to
  // them - folding that into the query filter (rather than a separate
  // findById + ownership check) makes the "not my task" and "task doesn't
  // exist" cases indistinguishable to the caller, which is the safer
  // default for an authorization check.
  if (restrictToAssignee) filter.assignee = restrictToAssignee;

  const result = await Task.findOneAndUpdate(filter, { status });
  return Boolean(result);
}

/** Creates exactly one follow-up for a completed recurring task. The atomic
 * flag on the completed source makes retries and repeated UI submissions safe. */
export async function createNextRecurringTask(taskId: string, organizationId: string): Promise<void> {
  if (!isValidObjectId(taskId)) return;
  await connectDB();
  const source = await Task.findOneAndUpdate(
    { _id: taskId, organization: organizationId, status: "completed", recurrence: { $in: ["daily", "weekly", "monthly"] }, recurrenceNextCreated: { $ne: true } },
    { $set: { recurrenceNextCreated: true } }, { returnDocument: "before" }
  ).lean();
  if (!source) return;
  const base = source.dueDate ? new Date(source.dueDate) : new Date();
  const nextDue = new Date(base);
  if (source.recurrence === "daily") nextDue.setDate(nextDue.getDate() + 1);
  if (source.recurrence === "weekly") nextDue.setDate(nextDue.getDate() + 7);
  if (source.recurrence === "monthly") nextDue.setMonth(nextDue.getMonth() + 1);
  if (source.recurrenceEndDate && nextDue > source.recurrenceEndDate) return;
  await Task.create({ project: source.project, organization: source.organization, title: source.title, description: source.description, status: "todo", priority: source.priority, assignee: source.assignee, createdBy: source.createdBy, dueDate: nextDue, estimatedHours: source.estimatedHours, recurrence: source.recurrence, recurrenceEndDate: source.recurrenceEndDate, dependsOn: source.dependsOn ?? [] });
}

export async function areValidDependencies(taskId: string | undefined, projectId: string, organizationId: string, dependencyIds: string[]): Promise<boolean> {
  if (dependencyIds.length === 0) return true;
  if (taskId && dependencyIds.includes(taskId)) return false;
  if (dependencyIds.some((id) => !isValidObjectId(id))) return false;
  await connectDB();
  const count = await Task.countDocuments({ _id: { $in: dependencyIds }, project: projectId, organization: organizationId });
  return count === dependencyIds.length;
}

export async function deleteTask(taskId: string, organizationId: string): Promise<boolean> {
  if (!isValidObjectId(taskId)) return false;

  await connectDB();

  const task = await Task.findOneAndDelete({ _id: taskId, organization: organizationId });
  if (!task) return false;

  // A task owns all dependent records. Delete stored upload bytes too, so a
  // task deletion does not leave orphaned database records or disk files.
  const attachments = await Attachment.find({ task: taskId }).select("storageKey").lean();
  await Promise.all(attachments.map((attachment) => deleteFileByKey(attachment.storageKey)));
  await Promise.all([
    Subtask.deleteMany({ task: taskId }),
    Comment.deleteMany({ task: taskId }),
    Attachment.deleteMany({ task: taskId }),
    TimeEntry.deleteMany({ task: taskId }),
    Notification.deleteMany({ relatedTask: taskId }),
  ]);
  return true;
}

/** Deletes every task (and their subtasks) belonging to a project - used when a project itself is deleted. */
export async function deleteTasksForProject(projectId: string): Promise<void> {
  await connectDB();
  const tasks = await Task.find({ project: projectId }).select("_id organization").lean();
  for (const task of tasks) {
    await deleteTask(task._id.toString(), task.organization.toString());
  }
}

export interface SubtaskSummary {
  id: string;
  title: string;
  completed: boolean;
  position: number;
}

export async function getSubtasksForTask(taskId: string): Promise<SubtaskSummary[]> {
  await connectDB();

  const subtasks = await Subtask.find({ task: taskId }).sort({ position: 1 }).lean();

  return subtasks.map((subtask) => ({
    id: subtask._id.toString(),
    title: subtask.title,
    completed: subtask.completed,
    position: subtask.position,
  }));
}

/**
 * Confirms a task belongs to the caller's organization before any subtask
 * mutation touches it - subtasks have no organization field of their own,
 * so this indirect check through Task is how they stay tenant-isolated.
 */
async function taskBelongsToOrg(taskId: string, organizationId: string): Promise<boolean> {
  if (!isValidObjectId(taskId)) return false;
  await connectDB();
  return Boolean(await Task.exists({ _id: taskId, organization: organizationId }));
}

export async function createSubtask(
  taskId: string,
  organizationId: string,
  title: string
): Promise<{ ok: boolean; id?: string }> {
  if (!(await taskBelongsToOrg(taskId, organizationId))) return { ok: false };

  const lastSubtask = await Subtask.findOne({ task: taskId }).sort({ position: -1 }).lean();
  const nextPosition = lastSubtask ? lastSubtask.position + 1 : 0;

  const subtask = await Subtask.create({ task: taskId, title, position: nextPosition });
  return { ok: true, id: subtask._id.toString() };
}

export async function toggleSubtask(
  subtaskId: string,
  taskId: string,
  organizationId: string,
  completed: boolean
): Promise<boolean> {
  if (!isValidObjectId(subtaskId)) return false;
  if (!(await taskBelongsToOrg(taskId, organizationId))) return false;

  const result = await Subtask.findOneAndUpdate({ _id: subtaskId, task: taskId }, { completed });
  return Boolean(result);
}

export async function deleteSubtask(
  subtaskId: string,
  taskId: string,
  organizationId: string
): Promise<boolean> {
  if (!isValidObjectId(subtaskId)) return false;
  if (!(await taskBelongsToOrg(taskId, organizationId))) return false;

  const result = await Subtask.deleteOne({ _id: subtaskId, task: taskId });
  return result.deletedCount > 0;
}

/** Swaps a subtask's position with its immediate neighbour in the given direction. */
export async function moveSubtask(
  subtaskId: string,
  taskId: string,
  organizationId: string,
  direction: "up" | "down"
): Promise<boolean> {
  if (!isValidObjectId(subtaskId)) return false;
  if (!(await taskBelongsToOrg(taskId, organizationId))) return false;

  const subtask = await Subtask.findOne({ _id: subtaskId, task: taskId });
  if (!subtask) return false;

  const neighbour = await Subtask.findOne({
    task: taskId,
    position: direction === "up" ? { $lt: subtask.position } : { $gt: subtask.position },
  }).sort({ position: direction === "up" ? -1 : 1 });

  if (!neighbour) return false; // already at the top/bottom - nothing to swap with

  const thisPosition = subtask.position;
  subtask.position = neighbour.position;
  neighbour.position = thisPosition;

  await Promise.all([subtask.save(), neighbour.save()]);
  return true;
}
