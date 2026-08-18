import "server-only";
import { isValidObjectId } from "mongoose";
import connectDB from "~/lib/db";
import TimeEntry from "~/models/time_entry";
import Task from "~/models/tasks";

export interface TimeEntrySummary {
  id: string;
  userId: string;
  taskId?: string;
  taskTitle?: string;
  projectName?: string;
  startedAt: Date;
  endedAt: Date | null;
  duration: number | null;
  billable: boolean;
  note: string;
}

async function taskExistsForOrg(taskId: string, organizationId: string): Promise<boolean> {
  if (!isValidObjectId(taskId)) return false;
  await connectDB();
  return Boolean(await Task.exists({ _id: taskId, organization: organizationId }));
}

export async function startTimer(taskId: string, organizationId: string, userId: string) {
  if (!(await taskExistsForOrg(taskId, organizationId))) return { ok: false as const, error: "Task not found." };
  const running = await TimeEntry.findOne({ user: userId, endedAt: { $exists: false } }).lean();
  if (running) return { ok: false as const, error: "Stop your current timer before starting another one." };
  const entry = await TimeEntry.create({ task: taskId, user: userId, startedAt: new Date() });
  return { ok: true as const, id: entry._id.toString() };
}

export async function stopTimer(entryId: string, taskId: string, organizationId: string, userId: string) {
  if (!isValidObjectId(entryId) || !(await taskExistsForOrg(taskId, organizationId))) {
    return { ok: false as const, error: "Time entry not found." };
  }
  const entry = await TimeEntry.findOne({ _id: entryId, task: taskId, user: userId, endedAt: { $exists: false } });
  if (!entry) return { ok: false as const, error: "Time entry not found." };
  entry.endedAt = new Date();
  await entry.save();
  return { ok: true as const };
}

export async function getTimeEntriesForTask(taskId: string, organizationId: string): Promise<TimeEntrySummary[]> {
  if (!(await taskExistsForOrg(taskId, organizationId))) return [];
  const entries = await TimeEntry.find({ task: taskId }).sort({ startedAt: -1 }).lean();
  return entries.map((entry) => ({
    id: entry._id.toString(), userId: entry.user.toString(), startedAt: entry.startedAt,
    endedAt: entry.endedAt ?? null, duration: entry.duration ?? null, billable: entry.billable ?? true, note: entry.note ?? "",
  }));
}

export interface TimesheetData { entries: TimeEntrySummary[]; tasks: { id: string; title: string; projectName: string }[]; }

export async function getTimesheetForUser(userId: string, organizationId: string, start: Date, end: Date): Promise<TimesheetData> {
  await connectDB();
  const [entries, tasks] = await Promise.all([
    TimeEntry.find({ user: userId, startedAt: { $gte: start, $lt: end } }).populate({ path: "task", select: "title project", populate: { path: "project", select: "name" } }).sort({ startedAt: -1 }).lean(),
    Task.find({ organization: organizationId }).populate("project", "name").select("_id title project").sort({ title: 1 }).lean(),
  ]);
  return {
    entries: entries.map((entry) => { const task = entry.task as unknown as { _id: { toString(): string }; title: string; project?: { name: string } } | null; return { id: entry._id.toString(), userId: entry.user.toString(), taskId: task?._id.toString(), taskTitle: task?.title, projectName: task?.project?.name, startedAt: entry.startedAt, endedAt: entry.endedAt ?? null, duration: entry.duration ?? null, billable: entry.billable ?? true, note: entry.note ?? "" }; }),
    tasks: tasks.map((task) => { const project = task.project as unknown as { name: string } | null; return { id: task._id.toString(), title: task.title, projectName: project?.name ?? "Project" }; }),
  };
}

export async function getCurrentWeekTimesheet(userId: string, organizationId: string): Promise<TimesheetData & { weekStart: Date; weekEnd: Date }> {
  const today = new Date(); const start = new Date(today); const day = start.getDay(); const offset = day === 0 ? -6 : 1 - day; start.setDate(start.getDate() + offset); start.setHours(0, 0, 0, 0); const end = new Date(start); end.setDate(end.getDate() + 7);
  return { ...(await getTimesheetForUser(userId, organizationId, start, end)), weekStart: start, weekEnd: end };
}

export async function createManualTimeEntry(params: { taskId: string; organizationId: string; userId: string; startedAt: Date; endedAt: Date; billable: boolean; note: string }) {
  if (!(await taskExistsForOrg(params.taskId, params.organizationId))) return { ok: false as const, error: "Task not found." };
  if (params.endedAt <= params.startedAt) return { ok: false as const, error: "End time must be after start time." };
  const entry = new TimeEntry({ task: params.taskId, user: params.userId, startedAt: params.startedAt, endedAt: params.endedAt, billable: params.billable, note: params.note }); await entry.save(); return { ok: true as const, id: entry._id.toString() };
}

export async function deleteTimeEntry(entryId: string, organizationId: string, userId: string) {
  if (!isValidObjectId(entryId)) return false; await connectDB(); const entry = await TimeEntry.findOne({ _id: entryId, user: userId }); if (!entry) return false; if (!(await taskExistsForOrg(entry.task.toString(), organizationId))) return false; await entry.deleteOne(); return true;
}
