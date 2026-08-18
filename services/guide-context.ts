import "server-only";
import connectDB from "~/lib/db";
import Project from "~/models/projects";
import Task from "~/models/tasks";
import Invoice from "~/models/invoice";
import { searchOrganization } from "~/services/search";

export async function getGuideWorkspaceContext(organizationId: string, question: string): Promise<string> {
  await connectDB();
  const [projects, tasks, invoices, matches] = await Promise.all([
    Project.find({ organization: organizationId }).select("_id name status priority deadline client budget hourlyRate").populate("client", "name company").sort({ deadline: 1 }).limit(40).lean(),
    Task.find({ organization: organizationId }).select("_id title status priority dueDate project assignee").populate("project", "name").populate("assignee", "name").sort({ dueDate: 1 }).limit(80).lean(),
    Invoice.find({ organization: organizationId }).select("number status dueDate total project").populate("project", "name").sort({ dueDate: 1 }).limit(40).lean(),
    searchOrganization(organizationId, question),
  ]);
  const date = new Date().toISOString().slice(0, 10);
  const projectLines = projects.map((project) => { const client = project.client as unknown as { name?: string; company?: string } | null; return `- ${project.name} | status: ${project.status} | priority: ${project.priority} | deadline: ${project.deadline?.toISOString().slice(0, 10) ?? "not set"} | client: ${client?.company ?? client?.name ?? "not set"} | link: /dashboard/projects/${project._id}`; }).join("\n");
  const taskLines = tasks.map((task) => { const project = task.project as unknown as { _id?: { toString(): string }; name?: string } | null; const assignee = task.assignee as unknown as { name?: string } | null; return `- ${task.title} | project: ${project?.name ?? "unknown"} | status: ${task.status} | priority: ${task.priority} | due: ${task.dueDate?.toISOString().slice(0, 10) ?? "not set"} | assignee: ${assignee?.name ?? "unassigned"} | link: ${project?._id ? `/dashboard/projects/${project._id.toString()}/tasks/${task._id}` : "/dashboard/projects"}`; }).join("\n");
  const invoiceLines = invoices.map((invoice) => { const project = invoice.project as unknown as { name?: string } | null; return `- ${invoice.number} | project: ${project?.name ?? "unknown"} | status: ${invoice.status} | due: ${invoice.dueDate?.toISOString().slice(0, 10) ?? "not set"} | total: ${invoice.total}`; }).join("\n");
  const matchLines = matches.map((match) => `- ${match.type}: ${match.title} | ${match.subtitle} | link: ${match.href}`).join("\n");
  return `Today is ${date}. This is private, current data from the signed-in user's active organization. Use it to answer factual questions.\n\nMATCHES FOR THE USER'S QUESTION:\n${matchLines || "None"}\n\nPROJECTS:\n${projectLines || "None"}\n\nTASKS:\n${taskLines || "None"}\n\nINVOICES:\n${invoiceLines || "None"}`.slice(0, 30000);
}
