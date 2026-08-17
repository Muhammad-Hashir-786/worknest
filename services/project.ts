import "server-only";
import { isValidObjectId } from "mongoose";
import connectDB from "../lib/db";
import Project from "../models/projects";
// Populate resolves models from Mongoose's registry. These side-effect imports
// make the registry complete even when Turbopack evaluates this service in an
// isolated route bundle during development.
import "../models/client";
import "../models/user";
import ProjectMember from "../models/project_members";
import { getOrganizationMembers, getMembership } from "../services/organization";
import { deleteTasksForProject } from "../services/task";
import { escapeRegExp } from "../lib/utils/text";
import type { ProjectStatus, Priority, ProjectMemberRole } from "../lib/constants/roles";

export interface ProjectListFilters {
  status?: ProjectStatus;
  priority?: Priority;
  search?: string;
}

export interface ProjectSummary {
  id: string;
  name: string;
  status: ProjectStatus;
  priority: Priority;
  startDate: Date;
  deadline: Date;
  client: { id: string; name: string } | null;
  memberCount: number;
  // Computed once here (Node.js, not a React render path) rather than in
  // the card component - `Date.now()` inside a component body is an impure
  // call the React Compiler flags, since the same props could then render
  // differently depending on when the render happens to run.
  isOverdue: boolean;
}

function computeIsOverdue(status: ProjectStatus, deadline: Date): boolean {
  return status !== "completed" && status !== "archived" && deadline.getTime() < Date.now();
}

function summarize(project: Record<string, unknown>, memberCount: number): ProjectSummary {
  const client = project.client as { _id: { toString(): string }; name: string } | null;

  return {
    id: (project._id as { toString(): string }).toString(),
    name: project.name as string,
    status: project.status as ProjectStatus,
    priority: project.priority as Priority,
    startDate: project.startDate as Date,
    deadline: project.deadline as Date,
    client: client ? { id: client._id.toString(), name: client.name } : null,
    memberCount,
    isOverdue: computeIsOverdue(project.status as ProjectStatus, project.deadline as Date),
  };
}

/**
 * Every project in the organization, most recently created first, with
 * optional status/priority/search filters applied server-side. This is the
 * only way the project list is ever queried - there is no path that lists
 * projects without an organizationId.
 */
export async function getProjectsForOrg(
  organizationId: string,
  filters: ProjectListFilters = {}
): Promise<ProjectSummary[]> {
  await connectDB();

  const query: Record<string, unknown> = { organization: organizationId };
  if (filters.status) query.status = filters.status;
  if (filters.priority) query.priority = filters.priority;
  if (filters.search) {
    query.name = { $regex: escapeRegExp(filters.search), $options: "i" };
  }

  const projects = await Project.find(query)
    .populate("client", "name")
    .sort({ createdAt: -1 })
    .lean();

  if (projects.length === 0) return [];

  const memberCounts = await ProjectMember.aggregate<{ _id: unknown; count: number }>([
    { $match: { project: { $in: projects.map((p) => p._id) } } },
    { $group: { _id: "$project", count: { $sum: 1 } } },
  ]);
  const countByProjectId = new Map(memberCounts.map((row) => [String(row._id), row.count]));

  return projects.map((project) =>
    summarize(
      project as unknown as Record<string, unknown>,
      countByProjectId.get(project._id.toString()) ?? 0
    )
  );
}

export interface ProjectDetail {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  priority: Priority;
  startDate: Date;
  deadline: Date;
  client: { id: string; name: string };
  createdBy: { id: string; name: string } | null;
  createdAt: Date;
}

/**
 * Loads a single project, but ONLY if it belongs to `organizationId`. This
 * is the pattern every project lookup in the app must use instead of
 * `Project.findById(id)` - a bare findById would let a caller supply any
 * project id from any organization and read data that isn't theirs.
 */
export async function getProjectForOrg(
  projectId: string,
  organizationId: string
): Promise<ProjectDetail | null> {
  if (!isValidObjectId(projectId)) return null;

  await connectDB();

  const project = await Project.findOne({ _id: projectId, organization: organizationId })
    .populate("client", "name")
    .populate("createdBy", "name")
    .lean();

  if (!project) return null;

  const client = project.client as unknown as { _id: { toString(): string }; name: string } | null;
  const createdBy = project.createdBy as unknown as
    | { _id: { toString(): string }; name: string }
    | null;

  return {
    id: project._id.toString(),
    name: project.name,
    description: project.description,
    status: project.status as ProjectStatus,
    priority: project.priority as Priority,
    startDate: project.startDate,
    deadline: project.deadline,
    // client is required at the schema level, so a project that loaded
    // successfully always has one - but populate() against a deleted
    // client document would leave this null, hence the fallback.
    client: client
      ? { id: client._id.toString(), name: client.name }
      : { id: "", name: "Unknown client" },
    createdBy: createdBy ? { id: createdBy._id.toString(), name: createdBy.name } : null,
    createdAt: project.createdAt,
  };
}

export async function createProject(params: {
  organizationId: string;
  createdBy: string;
  name: string;
  description: string;
  priority: Priority;
  startDate: Date;
  deadline: Date;
  clientId: string;
}): Promise<{ id: string }> {
  await connectDB();

  const project = await Project.create({
    organization: params.organizationId,
    name: params.name,
    description: params.description,
    status: "planning",
    priority: params.priority,
    startDate: params.startDate,
    deadline: params.deadline,
    client: params.clientId,
    createdBy: params.createdBy,
  });

  // The creator is automatically added as project lead, mirroring the
  // "creator becomes owner" pattern already used for organizations - a
  // project should never start out with zero members.
  await ProjectMember.create({
    project: project._id,
    user: params.createdBy,
    role: "lead",
  });

  return { id: project._id.toString() };
}

/**
 * Updates a project, scoped to the organization via findOneAndUpdate's
 * filter (not a separate findById + save) so the update itself is atomic
 * and can never silently apply to another organization's project.
 */
export async function updateProject(
  projectId: string,
  organizationId: string,
  data: {
    name: string;
    description: string;
    status: ProjectStatus;
    priority: Priority;
    startDate: Date;
    deadline: Date;
    clientId: string;
  }
): Promise<boolean> {
  if (!isValidObjectId(projectId)) return false;

  await connectDB();

  const result = await Project.findOneAndUpdate(
    { _id: projectId, organization: organizationId },
    {
      name: data.name,
      description: data.description,
      status: data.status,
      priority: data.priority,
      startDate: data.startDate,
      deadline: data.deadline,
      client: data.clientId,
    }
  );

  return Boolean(result);
}

/**
 * Permanently removes a project, its membership records, and (as of
 * Milestone 7) every task and subtask that belonged to it. Comment/
 * attachment cascades will be added once those models have real data
 * (Milestone 8).
 */
export async function deleteProject(projectId: string, organizationId: string): Promise<boolean> {
  if (!isValidObjectId(projectId)) return false;

  await connectDB();

  const project = await Project.findOneAndDelete({ _id: projectId, organization: organizationId });
  if (!project) return false;

  await Promise.all([
    ProjectMember.deleteMany({ project: projectId }),
    deleteTasksForProject(projectId),
  ]);
  return true;
}

export interface ProjectMemberSummary {
  membershipId: string;
  role: ProjectMemberRole;
  user: { id: string; name: string; email: string; avatar: string };
}

export async function getProjectMembers(projectId: string): Promise<ProjectMemberSummary[]> {
  await connectDB();

  const members = await ProjectMember.find({ project: projectId })
    .populate("user", "name email avatar")
    .sort({ addedAt: 1 })
    .lean();

  return members
    .filter(
      (member): member is typeof member & { user: NonNullable<typeof member.user> } =>
        Boolean(member.user) // defensive: skip memberships pointing at a deleted user
    )
    .map((member) => {
      const user = member.user as unknown as {
        _id: { toString(): string };
        name: string;
        email: string;
        avatar: string;
      };
      return {
        membershipId: member._id.toString(),
        role: member.role as ProjectMemberRole,
        user: { id: user._id.toString(), name: user.name, email: user.email, avatar: user.avatar },
      };
    });
}

/**
 * Organization members who are NOT already on this project - the pool
 * shown in the "add member" dropdown. Sourced from organization membership
 * (not a raw User query) so a user from another org can never be offered.
 */
export async function getAddableOrgMembers(
  projectId: string,
  organizationId: string
): Promise<{ userId: string; name: string; email: string }[]> {
  await connectDB();

  const [orgMembers, existingProjectMembers] = await Promise.all([
    getOrganizationMembers(organizationId),
    ProjectMember.find({ project: projectId }).select("user").lean(),
  ]);

  const alreadyOnProject = new Set(existingProjectMembers.map((m) => m.user.toString()));

  return orgMembers
    .filter((member) => !alreadyOnProject.has(member.user.id))
    .map((member) => ({ userId: member.user.id, name: member.user.name, email: member.user.email }));
}

type AddProjectMemberResult = { ok: true } | { ok: false; error: string };

/**
 * Adds an organization member to a project. Two checks guard this beyond
 * the caller's own permission check: the project must belong to the caller's
 * organization, and the user being added must ALREADY be a member of that
 * same organization - a project can never gain a member from outside the org.
 */
export async function addProjectMember(params: {
  projectId: string;
  organizationId: string;
  userId: string;
  role: ProjectMemberRole;
}): Promise<AddProjectMemberResult> {
  if (!isValidObjectId(params.projectId) || !isValidObjectId(params.userId)) {
    return { ok: false, error: "Invalid project or user." };
  }

  await connectDB();

  const project = await Project.exists({ _id: params.projectId, organization: params.organizationId });
  if (!project) return { ok: false, error: "Project not found." };

  const membership = await getMembership(params.userId, params.organizationId);
  if (!membership) return { ok: false, error: "That user is not a member of this organization." };

  try {
    await ProjectMember.create({ project: params.projectId, user: params.userId, role: params.role });
  } catch (error) {
    // Unique (project, user) index - someone else's concurrent request (or
    // a double-submit) already added this person.
    if (isDuplicateKeyError(error)) {
      return { ok: false, error: "This person is already on the project." };
    }
    throw error;
  }

  return { ok: true };
}

export async function removeProjectMember(
  membershipId: string,
  projectId: string,
  organizationId: string
): Promise<boolean> {
  if (!isValidObjectId(membershipId) || !isValidObjectId(projectId)) return false;

  await connectDB();

  const project = await Project.exists({ _id: projectId, organization: organizationId });
  if (!project) return false;

  const result = await ProjectMember.deleteOne({ _id: membershipId, project: projectId });
  return result.deletedCount > 0;
}

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: number }).code === 11000;
}
