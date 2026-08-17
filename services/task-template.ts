import "server-only";
import connectDB from "~/lib/db";
import TaskTemplate from "~/models/task_template";
import type { Priority } from "~/lib/constants/roles";

export interface TaskTemplateSummary { id: string; name: string; title: string; description: string; priority: Priority; estimatedHours: number | null; recurrence: "none" | "daily" | "weekly" | "monthly"; }

export async function getTaskTemplates(organizationId: string, projectId: string): Promise<TaskTemplateSummary[]> {
  await connectDB();
  const rows = await TaskTemplate.find({ organization: organizationId, project: projectId }).sort({ name: 1 }).lean();
  return rows.map((row) => ({ id: row._id.toString(), name: row.name, title: row.title, description: row.description, priority: row.priority as Priority, estimatedHours: row.estimatedHours ?? null, recurrence: row.recurrence as TaskTemplateSummary["recurrence"] }));
}

export async function createTaskTemplate(params: { organizationId: string; projectId: string; userId: string; name: string; title: string; description: string; priority: Priority; estimatedHours?: number; recurrence: TaskTemplateSummary["recurrence"] }) {
  await connectDB();
  await TaskTemplate.findOneAndUpdate(
    { organization: params.organizationId, project: params.projectId, name: params.name },
    { $set: { title: params.title, description: params.description, priority: params.priority, estimatedHours: params.estimatedHours, recurrence: params.recurrence }, $setOnInsert: { organization: params.organizationId, project: params.projectId, createdBy: params.userId } },
    { upsert: true }
  );
}
