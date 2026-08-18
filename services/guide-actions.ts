import "server-only";
import { searchOrganization } from "~/services/search";
import connectDB from "~/lib/db";
import User from "~/models/user";

export type GuideAction =
  | { type: "create_task"; label: string; confirmation: string; payload: { projectId: string; projectName: string; title: string; assigneeId?: string; assigneeName?: string } }
  | { type: "change_status"; label: string; confirmation: string; payload: { taskId: string; projectId: string; taskTitle: string; status: "todo" | "in_progress" | "in_review" | "completed" } }
  | { type: "assign_task"; label: string; confirmation: string; payload: { taskId: string; projectId: string; taskTitle: string; assigneeId: string; assigneeName: string } };

export async function detectGuideAction(organizationId: string, message: string): Promise<GuideAction | undefined> {
  const text = message.trim();
  const createMatch = text.match(/^(?:please\s+)?(?:create|add|make)\s+(?:a\s+)?task(?:\s+(?:called|named))?\s+(.+)$/i);
  if (createMatch) {
    const rest = createMatch[1].trim(); const split = rest.match(/^['“]?(.+?)['”]?\s+(?:in|for)\s+(?:project\s+)?(.+)$/i);
    const title = (split?.[1] ?? rest).trim().replace(/^['“]|['”]$/g, ""); const projectQuery = split?.[2]?.trim();
    if (!projectQuery) return undefined;
    const project = (await searchOrganization(organizationId, projectQuery)).find((item) => item.type === "Project");
    if (!project) return undefined;
    const assignment = title.match(/^(.+?)\s+(?:and\s+)?assign\s+to\s+(.+)$/i);
    if (assignment) {
      await connectDB();
      const person = await User.findOne({ name: { $regex: `^${assignment[2].trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" } }).select("_id name").lean();
      if (person) return { type: "create_task", label: "Create and assign task", confirmation: `Create “${assignment[1]}” in ${project.title} and assign it to ${person.name}?`, payload: { projectId: project.id, projectName: project.title, title: assignment[1], assigneeId: person._id.toString(), assigneeName: person.name } };
    }
    return { type: "create_task", label: "Create task", confirmation: `Create “${title}” in ${project.title}?`, payload: { projectId: project.id, projectName: project.title, title } };
  }
  const statusMatch = text.match(/^(?:please\s+)?(?:move|mark|set|change)\s+(?:the\s+)?task\s+(.+?)\s+(?:to|as)\s+(todo|in progress|in review|completed)$/i);
  if (statusMatch) {
    const task = (await searchOrganization(organizationId, statusMatch[1])).find((item) => item.type === "Task");
    const status = statusMatch[2].toLowerCase().replace(" ", "_") as "todo" | "in_progress" | "in_review" | "completed";
    if (!task) return undefined;
    const projectId = task.href.match(/\/projects\/([^/]+)/)?.[1]; if (!projectId) return undefined;
    return { type: "change_status", label: "Change task status", confirmation: `Move “${task.title}” to ${status.replaceAll("_", " ")}?`, payload: { taskId: task.id, projectId, taskTitle: task.title, status } };
  }
  const assignMatch = text.match(/^(?:please\s+)?(?:assign|give)\s+(?:the\s+)?task\s+(.+?)\s+to\s+(.+)$/i);
  if (assignMatch) {
    const task = (await searchOrganization(organizationId, assignMatch[1])).find((item) => item.type === "Task");
    if (!task) return undefined;
    const projectId = task.href.match(/\/projects\/([^/]+)/)?.[1]; if (!projectId) return undefined;
    await connectDB();
    const person = await User.findOne({ name: { $regex: `^${assignMatch[2].trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" } }).select("_id name").lean();
    if (!person) return undefined;
    return { type: "assign_task", label: "Assign task", confirmation: `Assign “${task.title}” to ${person.name}?`, payload: { taskId: task.id, projectId, taskTitle: task.title, assigneeId: person._id.toString(), assigneeName: person.name } };
  }
  return undefined;
}
