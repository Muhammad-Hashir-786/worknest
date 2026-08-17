import "server-only";
import { isValidObjectId } from "mongoose";
import connectDB from "~/lib/db";
import Milestone from "~/models/milestone";
import Project from "~/models/projects";

export interface MilestoneSummary { id: string; title: string; dueDate: Date; completed: boolean; }

async function projectInOrg(projectId: string, organizationId: string) {
  return isValidObjectId(projectId) && Boolean(await Project.exists({ _id: projectId, organization: organizationId }));
}

export async function getMilestones(projectId: string, organizationId: string): Promise<MilestoneSummary[]> {
  await connectDB();
  if (!(await projectInOrg(projectId, organizationId))) return [];
  const rows = await Milestone.find({ project: projectId, organization: organizationId }).sort({ dueDate: 1 }).lean();
  return rows.map((row) => ({ id: row._id.toString(), title: row.title, dueDate: row.dueDate, completed: row.completed }));
}

export async function createMilestone(projectId: string, organizationId: string, title: string, dueDate: Date) {
  await connectDB();
  if (!(await projectInOrg(projectId, organizationId))) return null;
  const row = await Milestone.create({ project: projectId, organization: organizationId, title, dueDate });
  return row._id.toString();
}

export async function toggleMilestone(id: string, projectId: string, organizationId: string, completed: boolean) {
  if (!isValidObjectId(id)) return false;
  await connectDB();
  return Boolean(await Milestone.findOneAndUpdate({ _id: id, project: projectId, organization: organizationId }, { completed }));
}
