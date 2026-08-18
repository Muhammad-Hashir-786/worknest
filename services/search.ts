import "server-only";
import connectDB from "~/lib/db";
import Project from "~/models/projects";
import Task from "~/models/tasks";
import Client from "~/models/client";
import { escapeRegExp } from "~/lib/utils/text";

export interface SearchResult { id: string; title: string; subtitle: string; href: string; type: "Project" | "Task" | "Client"; }

export async function searchOrganization(organizationId: string, query: string): Promise<SearchResult[]> {
  const normalized = query.trim();
  if (normalized.length < 2) return [];
  await connectDB();
  const pattern = { $regex: escapeRegExp(normalized.slice(0, 80)), $options: "i" };
  const [projects, tasks, clients] = await Promise.all([
    Project.find({ organization: organizationId, name: pattern }).select("_id name status client").populate("client", "name").limit(5).lean(),
    Task.find({ organization: organizationId, title: pattern }).select("_id title status project").populate("project", "name").limit(7).lean(),
    Client.find({ organization: organizationId, $or: [{ name: pattern }, { company: pattern }, { email: pattern }] }).select("_id name company email").limit(5).lean(),
  ]);
  return [
    ...projects.map((item) => { const client = item.client as unknown as { name: string } | null; return { id: item._id.toString(), title: item.name, subtitle: `${client?.name ?? "No client"} · ${item.status.replaceAll("_", " ")}`, href: `/dashboard/projects/${item._id}`, type: "Project" as const }; }),
    ...tasks.map((item) => { const project = item.project as unknown as { _id: { toString(): string }; name: string } | null; return { id: item._id.toString(), title: item.title, subtitle: `${project?.name ?? "Unknown project"} · ${item.status.replaceAll("_", " ")}`, href: project ? `/dashboard/projects/${project._id.toString()}/tasks/${item._id}` : "/dashboard/projects", type: "Task" as const }; }),
    ...clients.map((item) => ({ id: item._id.toString(), title: item.name, subtitle: item.company ?? item.email ?? "Client", href: `/dashboard/clients/${item._id}`, type: "Client" as const })),
  ].slice(0, 12);
}
