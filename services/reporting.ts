import "server-only";
import connectDB from "~/lib/db";
import Task from "~/models/tasks";
import TimeEntry from "~/models/time_entry";
import Project from "~/models/projects";
import "~/models/user";

export interface WorkloadRow { userId: string; name: string; assigned: number; overdue: number; estimatedHours: number; loggedHours: number; }
export interface TimesheetRow { userId: string; name: string; project: string; task: string; date: Date; hours: number; }
export interface ReportSummary { loggedHours: number; estimatedHours: number; budget: number; spend: number; openTasks: number; }

export async function getOrganizationReport(organizationId: string): Promise<{ summary: ReportSummary; workload: WorkloadRow[]; timesheet: TimesheetRow[] }> {
  await connectDB();
  const [tasks, projects] = await Promise.all([
    Task.find({ organization: organizationId }).populate("assignee", "name").populate("project", "name").lean(),
    Project.find({ organization: organizationId }).select("budget hourlyRate").lean(),
  ]);
  const taskIds = tasks.map((task) => task._id);
  const entries = taskIds.length ? await TimeEntry.find({ task: { $in: taskIds }, endedAt: { $exists: true } }).populate("user", "name").lean() : [];
  const taskById = new Map(tasks.map((task) => [task._id.toString(), task]));
  const projectById = new Map(projects.map((project) => [project._id.toString(), project]));
  const workload = new Map<string, WorkloadRow>();
  for (const task of tasks) {
    if (!task.assignee) continue;
    const assignee = task.assignee as unknown as { _id: { toString(): string }; name: string };
    const id = assignee._id.toString(); const row = workload.get(id) ?? { userId: id, name: assignee.name, assigned: 0, overdue: 0, estimatedHours: 0, loggedHours: 0 };
    row.assigned += task.status === "completed" ? 0 : 1; row.estimatedHours += task.estimatedHours ?? 0;
    if (task.status !== "completed" && task.dueDate && task.dueDate.getTime() < Date.now()) row.overdue += 1;
    workload.set(id, row);
  }
  const timesheet: TimesheetRow[] = [];
  for (const entry of entries) {
    const task = taskById.get(entry.task.toString()); if (!task || !entry.user) continue;
    const user = entry.user as unknown as { _id: { toString(): string }; name: string }; const hours = (entry.duration ?? 0) / 3600;
    const row = workload.get(user._id.toString()) ?? { userId: user._id.toString(), name: user.name, assigned: 0, overdue: 0, estimatedHours: 0, loggedHours: 0 }; row.loggedHours += hours; workload.set(row.userId, row);
    const project = task.project as unknown as { name?: string } | null;
    timesheet.push({ userId: row.userId, name: user.name, project: project?.name ?? "Project", task: task.title, date: entry.startedAt, hours });
  }
  const loggedHours = timesheet.reduce((total, row) => total + row.hours, 0);
  const estimatedHours = tasks.reduce((total, task) => total + (task.estimatedHours ?? 0), 0);
  const budget = projects.reduce((total, project) => total + (project.budget ?? 0), 0);
  const spend = entries.reduce((total, entry) => { const task = taskById.get(entry.task.toString()); return total + ((entry.duration ?? 0) / 3600) * (task ? projectById.get(task.project._id?.toString?.() ?? task.project.toString())?.hourlyRate ?? 0 : 0); }, 0);
  return { summary: { loggedHours, estimatedHours, budget, spend, openTasks: tasks.filter((task) => task.status !== "completed").length }, workload: [...workload.values()].sort((a, b) => b.assigned - a.assigned), timesheet: timesheet.sort((a, b) => b.date.getTime() - a.date.getTime()) };
}
