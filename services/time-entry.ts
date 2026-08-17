import "server-only";
import { isValidObjectId } from "mongoose";
import connectDB from "~/lib/db";
import TimeEntry from "~/models/time_entry";
import Task from "~/models/tasks";

export interface TimeEntrySummary {
  id: string;
  userId: string;
  startedAt: Date;
  endedAt: Date | null;
  duration: number | null;
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
    endedAt: entry.endedAt ?? null, duration: entry.duration ?? null,
  }));
}
