import "server-only";
import { isValidObjectId } from "mongoose";
import connectDB from "~/lib/db";
import Project from "~/models/projects";
import PortalFeedback from "~/models/portal_feedback";

export interface PortalFeedbackSummary { id: string; type: "message" | "approval"; message: string; createdAt: Date; }

async function getPortalProjectRecord(token: string) {
  await connectDB();
  return Project.findOne({ clientPortalToken: token, clientPortalEnabled: true }).select("_id organization").lean();
}

export async function createPortalFeedback(token: string, type: "message" | "approval", message: string): Promise<{ ok: boolean; error?: string }> {
  const project = await getPortalProjectRecord(token);
  if (!project) return { ok: false, error: "This portal link is no longer active." };
  if (!message.trim() || message.trim().length > 1200) return { ok: false, error: "Enter a message under 1,200 characters." };
  await PortalFeedback.create({ organization: project.organization, project: project._id, type, message: message.trim() });
  return { ok: true };
}

export async function getPortalFeedback(token: string): Promise<PortalFeedbackSummary[]> {
  const project = await getPortalProjectRecord(token);
  if (!project) return [];
  const rows = await PortalFeedback.find({ project: project._id }).sort({ createdAt: -1 }).limit(30).lean();
  return rows.map((row) => ({ id: row._id.toString(), type: row.type as "message" | "approval", message: row.message, createdAt: row.createdAt }));
}

export async function getPortalFeedbackForProject(projectId: string, organizationId: string): Promise<PortalFeedbackSummary[]> {
  if (!isValidObjectId(projectId)) return [];
  await connectDB();
  const rows = await PortalFeedback.find({ project: projectId, organization: organizationId }).sort({ createdAt: -1 }).limit(30).lean();
  return rows.map((row) => ({ id: row._id.toString(), type: row.type as "message" | "approval", message: row.message, createdAt: row.createdAt }));
}
