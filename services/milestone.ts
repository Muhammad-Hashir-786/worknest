import "server-only";
import { isValidObjectId } from "mongoose";
import connectDB from "~/lib/db";
import Milestone from "~/models/milestone";
import Project from "~/models/projects";

export interface MilestoneSummary { id: string; title: string; dueDate: Date; completed: boolean; position: number; }

async function projectInOrg(projectId: string, organizationId: string) {
  return isValidObjectId(projectId) && Boolean(await Project.exists({ _id: projectId, organization: organizationId }));
}

export async function getMilestones(projectId: string, organizationId: string): Promise<MilestoneSummary[]> {
  await connectDB();
  if (!(await projectInOrg(projectId, organizationId))) return [];
  const rows = await Milestone.find({ project: projectId, organization: organizationId }).sort({ position: 1, dueDate: 1 }).lean();
  return rows.map((row) => ({ id: row._id.toString(), title: row.title, dueDate: row.dueDate, completed: row.completed, position: row.position ?? 0 }));
}

export async function createMilestone(projectId: string, organizationId: string, title: string, dueDate: Date) {
  await connectDB();
  if (!(await projectInOrg(projectId, organizationId))) return null;
  const last = await Milestone.findOne({ project: projectId, organization: organizationId }).sort({ position: -1 }).lean();
  const row = await Milestone.create({ project: projectId, organization: organizationId, title, dueDate, position: (last?.position ?? -1) + 1 });
  return row._id.toString();
}

export async function reorderMilestone(id: string, projectId: string, organizationId: string, targetIndex: number) {
  if (!isValidObjectId(id) || !Number.isInteger(targetIndex) || targetIndex < 0) return false;
  if (!(await projectInOrg(projectId, organizationId))) return false;
  const rows = await Milestone.find({ project: projectId, organization: organizationId }).sort({ position: 1, dueDate: 1 });
  const fromIndex = rows.findIndex((row) => row._id.toString() === id);
  if (fromIndex < 0) return false;
  const [moved] = rows.splice(fromIndex, 1);
  rows.splice(Math.min(targetIndex, rows.length), 0, moved);
  await Promise.all(rows.map((row, index) => Milestone.updateOne({ _id: row._id }, { position: index })));
  return true;
}

export async function toggleMilestone(id: string, projectId: string, organizationId: string, completed: boolean) {
  if (!isValidObjectId(id)) return false;
  await connectDB();
  return Boolean(await Milestone.findOneAndUpdate({ _id: id, project: projectId, organization: organizationId }, { completed }));
}
