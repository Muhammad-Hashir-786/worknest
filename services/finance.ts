import "server-only";
import { isValidObjectId } from "mongoose";
import connectDB from "~/lib/db";
import Project from "~/models/projects";
import Invoice from "~/models/invoice";
import { randomBytes } from "node:crypto";

export interface FinanceSummary { budget: number; hourlyRate: number; portalEnabled: boolean; portalToken: string | null; }
export interface InvoiceSummary { id: string; number: string; status: string; issueDate: Date; dueDate: Date; total: number; }
export async function getProjectFinance(projectId: string, organizationId: string): Promise<FinanceSummary | null> {
  if (!isValidObjectId(projectId)) return null; await connectDB();
  const project = await Project.findOne({ _id: projectId, organization: organizationId }).select("budget hourlyRate clientPortalEnabled +clientPortalToken").lean();
  if (!project) return null; return { budget: project.budget ?? 0, hourlyRate: project.hourlyRate ?? 0, portalEnabled: project.clientPortalEnabled ?? false, portalToken: project.clientPortalToken ?? null };
}
export async function updateProjectFinance(projectId: string, organizationId: string, budget: number, hourlyRate: number, portalEnabled: boolean): Promise<FinanceSummary | null> {
  if (!isValidObjectId(projectId)) return null; await connectDB();
  const project = await Project.findOne({ _id: projectId, organization: organizationId }).select("budget hourlyRate clientPortalEnabled +clientPortalToken");
  if (!project) return null;
  project.budget = budget; project.hourlyRate = hourlyRate; project.clientPortalEnabled = portalEnabled;
  // Keep the shared link stable; generate only on first enable. Disabling immediately revokes portal access.
  if (portalEnabled && !project.clientPortalToken) project.clientPortalToken = randomBytes(24).toString("base64url");
  await project.save(); return { budget: project.budget ?? 0, hourlyRate: project.hourlyRate ?? 0, portalEnabled: project.clientPortalEnabled ?? false, portalToken: project.clientPortalToken ?? null };
}
export async function getInvoices(projectId: string, organizationId: string): Promise<InvoiceSummary[]> {
  await connectDB(); const rows = await Invoice.find({ project: projectId, organization: organizationId }).sort({ createdAt: -1 }).lean();
  return rows.map((row) => ({ id: row._id.toString(), number: row.number, status: row.status, issueDate: row.issueDate, dueDate: row.dueDate, total: row.total }));
}
export async function createInvoice(params: { projectId: string; organizationId: string; clientId: string; description: string; quantity: number; unitPrice: number; dueDate: Date; }) {
  await connectDB(); const project = await Project.exists({ _id: params.projectId, organization: params.organizationId }); if (!project) return null;
  const number = `INV-${new Date().getFullYear()}-${String(await Invoice.countDocuments({ organization: params.organizationId }) + 1).padStart(4, "0")}`; const total = params.quantity * params.unitPrice;
  const invoice = await Invoice.create({ organization: params.organizationId, project: params.projectId, client: params.clientId, number, issueDate: new Date(), dueDate: params.dueDate, lineItems: [{ description: params.description, quantity: params.quantity, unitPrice: params.unitPrice }], total }); return invoice._id.toString();
}
export async function getPortalProject(token: string) {
  await connectDB(); const project = await Project.findOne({ clientPortalToken: token, clientPortalEnabled: true }).populate("client", "name company").lean(); if (!project) return null;
  const [tasks, invoices] = await Promise.all([import("~/models/tasks").then(({ default: Task }) => Task.find({ project: project._id }).select("title status dueDate").sort({ dueDate: 1 }).lean()), Invoice.find({ project: project._id }).select("number status dueDate total").sort({ createdAt: -1 }).lean()]);
  return { name: project.name, description: project.description, status: project.status, deadline: project.deadline, client: project.client as unknown as { name: string; company?: string }, tasks: tasks.map((task) => ({ id: task._id.toString(), title: task.title, status: task.status, dueDate: task.dueDate ?? null })), invoices: invoices.map((invoice) => ({ id: invoice._id.toString(), number: invoice.number, status: invoice.status, dueDate: invoice.dueDate, total: invoice.total })) };
}
