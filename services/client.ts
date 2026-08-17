import "server-only";
import { isValidObjectId } from "mongoose";
import connectDB from "../lib/db";
import Client from "../models/client";
import Project from "../models/projects";
import { escapeRegExp } from "../lib/utils/text";

export interface ClientOption {
  id: string;
  name: string;
  company: string;
}

/**
 * All clients belonging to an organization, for populating the client
 * picker on the project form. Deliberately minimal (id/name/company) -
 * see getClientsList below for the fuller record used by the Clients pages.
 */
export async function getClientsForOrg(organizationId: string): Promise<ClientOption[]> {
  await connectDB();

  const clients = await Client.find({ organization: organizationId })
    .select("name company")
    .sort({ name: 1 })
    .lean();

  return clients.map((client) => ({
    id: client._id.toString(),
    name: client.name,
    company: client.company ?? "",
  }));
}

/**
 * Confirms a client belongs to the given organization before it's allowed
 * to be attached to a project - the same "never trust a bare id" rule that
 * applies to every other cross-entity reference in the app.
 */
export async function getClientIdForOrg(
  clientId: string,
  organizationId: string
): Promise<string | null> {
  if (!isValidObjectId(clientId)) return null;

  await connectDB();
  const client = await Client.exists({ _id: clientId, organization: organizationId });
  return client ? clientId : null;
}

/**
 * Client creation. Used two ways: the full "new client" form (Milestone 9)
 * and the inline "create a client while creating a project" shortcut from
 * the Projects milestone - both just call this with whichever fields they
 * collected.
 */
export async function createClient(params: {
  organizationId: string;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  notes?: string;
}): Promise<{ id: string }> {
  await connectDB();

  const client = await Client.create({
    organization: params.organizationId,
    name: params.name,
    company: params.company || undefined,
    email: params.email || undefined,
    phone: params.phone || undefined,
    notes: params.notes || undefined,
  });

  return { id: client._id.toString() };
}

export interface ClientListFilters {
  search?: string;
}

export interface ClientSummary {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  projectCount: number;
}

/**
 * Every client in the organization, alphabetical by name, with an optional
 * search filter matched against name/company/email server-side. Mirrors
 * getProjectsForOrg's filter shape in services/project.ts.
 */
export async function getClientsList(
  organizationId: string,
  filters: ClientListFilters = {}
): Promise<ClientSummary[]> {
  await connectDB();

  const query: Record<string, unknown> = { organization: organizationId };
  if (filters.search) {
    const pattern = { $regex: escapeRegExp(filters.search), $options: "i" };
    query.$or = [{ name: pattern }, { company: pattern }, { email: pattern }];
  }

  const clients = await Client.find(query).sort({ name: 1 }).lean();
  if (clients.length === 0) return [];

  const projectCounts = await Project.aggregate<{ _id: unknown; count: number }>([
    { $match: { client: { $in: clients.map((c) => c._id) } } },
    { $group: { _id: "$client", count: { $sum: 1 } } },
  ]);
  const countByClientId = new Map(projectCounts.map((row) => [String(row._id), row.count]));

  return clients.map((client) => ({
    id: client._id.toString(),
    name: client.name,
    company: client.company ?? "",
    email: client.email ?? "",
    phone: client.phone ?? "",
    projectCount: countByClientId.get(client._id.toString()) ?? 0,
  }));
}

export interface ClientDetail {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  notes: string;
  createdAt: Date;
}

/**
 * Loads a single client, but ONLY if it belongs to `organizationId` - same
 * org-scoped-lookup rule as getProjectForOrg in services/project.ts.
 */
export async function getClientForOrg(
  clientId: string,
  organizationId: string
): Promise<ClientDetail | null> {
  if (!isValidObjectId(clientId)) return null;

  await connectDB();

  const client = await Client.findOne({ _id: clientId, organization: organizationId }).lean();
  if (!client) return null;

  return {
    id: client._id.toString(),
    name: client.name,
    company: client.company ?? "",
    email: client.email ?? "",
    phone: client.phone ?? "",
    notes: client.notes ?? "",
    createdAt: client.createdAt,
  };
}

/**
 * Updates a client, scoped to the organization via findOneAndUpdate's
 * filter so the update can never silently apply to another org's client.
 */
export async function updateClient(
  clientId: string,
  organizationId: string,
  data: { name: string; company: string; email: string; phone: string; notes: string }
): Promise<boolean> {
  if (!isValidObjectId(clientId)) return false;

  await connectDB();

  const result = await Client.findOneAndUpdate(
    { _id: clientId, organization: organizationId },
    {
      name: data.name,
      company: data.company || undefined,
      email: data.email || undefined,
      phone: data.phone || undefined,
      notes: data.notes || undefined,
    }
  );

  return Boolean(result);
}

export interface ClientProjectSummary {
  id: string;
  name: string;
  status: string;
}

/** Projects associated with a client, shown on the client detail page. */
export async function getProjectsForClient(
  clientId: string,
  organizationId: string
): Promise<ClientProjectSummary[]> {
  await connectDB();

  const projects = await Project.find({ client: clientId, organization: organizationId })
    .select("name status")
    .sort({ createdAt: -1 })
    .lean();

  return projects.map((project) => ({
    id: project._id.toString(),
    name: project.name,
    status: project.status,
  }));
}

type DeleteClientResult = { ok: true } | { ok: false; error: string };

/**
 * Deletes a client, but refuses if any project still references it - a
 * project's `client` field is required (not nullable), so deleting out
 * from under one would leave a dangling reference. The caller has to
 * reassign or delete those projects first; this fails closed rather than
 * silently orphaning the reference or cascading a delete the user didn't
 * ask for.
 */
export async function deleteClient(
  clientId: string,
  organizationId: string
): Promise<DeleteClientResult> {
  if (!isValidObjectId(clientId)) return { ok: false, error: "Client not found." };

  await connectDB();

  const client = await Client.exists({ _id: clientId, organization: organizationId });
  if (!client) return { ok: false, error: "Client not found." };

  const projectCount = await Project.countDocuments({ client: clientId });
  if (projectCount > 0) {
    return {
      ok: false,
      error: `This client is linked to ${projectCount} project${projectCount === 1 ? "" : "s"}. Reassign or delete ${projectCount === 1 ? "it" : "them"} first.`,
    };
  }

  await Client.deleteOne({ _id: clientId, organization: organizationId });
  return { ok: true };
}
