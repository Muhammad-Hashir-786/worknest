import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentOrgContext } from "~/lib/auth/current-org";
import { can } from "~/lib/permissions/permissions";
import { createTask, changeTaskStatus, getTaskForOrg, assignTask } from "~/services/task";
import { getProjectForOrg } from "~/services/project";
import { logActivity } from "~/services/activity";
import ProjectMember from "~/models/project_members";

const schema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("create_task"), payload: z.object({ projectId: z.string(), title: z.string().trim().min(1).max(200), assigneeId: z.string().optional() }) }),
  z.object({ type: z.literal("change_status"), payload: z.object({ taskId: z.string(), projectId: z.string(), status: z.enum(["todo", "in_progress", "in_review", "completed"]) }) }),
  z.object({ type: z.literal("assign_task"), payload: z.object({ taskId: z.string(), projectId: z.string(), assigneeId: z.string() }) }),
]);

export async function POST(request: Request) {
  const context = await getCurrentOrgContext();
  if (!context?.organization) return NextResponse.json({ error: "Sign in to use Guide actions." }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "That action is not valid." }, { status: 400 });
  const { organization, user, role } = context;
  if (!role) return NextResponse.json({ error: "You are not an active workspace member." }, { status: 403 });
  if (parsed.data.type === "create_task") {
    if (!can(role, "tasks:create")) return NextResponse.json({ error: "You don't have permission to create tasks." }, { status: 403 });
    const project = await getProjectForOrg(parsed.data.payload.projectId, organization.id);
    if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
    if (parsed.data.payload.assigneeId && !await ProjectMember.exists({ project: project.id, user: parsed.data.payload.assigneeId })) return NextResponse.json({ error: "That person is not a member of this project." }, { status: 400 });
    const task = await createTask({ projectId: project.id, organizationId: organization.id, createdBy: user.id, title: parsed.data.payload.title, description: "", priority: "medium", recurrence: "none", assignee: parsed.data.payload.assigneeId });
    await logActivity({ organizationId: organization.id, userId: user.id, action: "created", entityType: "Task", entityId: task.id, metadata: { title: parsed.data.payload.title, source: "guide" } });
    return NextResponse.json({ success: true, href: `/dashboard/projects/${project.id}/tasks/${task.id}` });
  }
  const task = await getTaskForOrg(parsed.data.payload.taskId, organization.id);
  if (!task || task.projectId !== parsed.data.payload.projectId) return NextResponse.json({ error: "Task not found." }, { status: 404 });
  if (parsed.data.type === "assign_task") {
    if (!can(role, "tasks:assign")) return NextResponse.json({ error: "You don't have permission to assign tasks." }, { status: 403 });
    if (!await ProjectMember.exists({ project: task.projectId, user: parsed.data.payload.assigneeId })) return NextResponse.json({ error: "That person is not a member of this project." }, { status: 400 });
    if (!await assignTask(task.id, organization.id, parsed.data.payload.assigneeId)) return NextResponse.json({ error: "The assignment could not be saved." }, { status: 400 });
    await logActivity({ organizationId: organization.id, userId: user.id, action: "assigned", entityType: "Task", entityId: task.id, metadata: { assigneeId: parsed.data.payload.assigneeId, source: "guide" } });
    return NextResponse.json({ success: true, href: `/dashboard/projects/${task.projectId}/tasks/${task.id}` });
  }
  if (!can(role, "tasks:update")) return NextResponse.json({ error: "You don't have permission to update tasks." }, { status: 403 });
  const restrict = can(role, "tasks:assign") ? undefined : user.id;
  const changed = await changeTaskStatus(task.id, organization.id, parsed.data.payload.status, restrict);
  if (!changed) return NextResponse.json({ error: "You can only update tasks assigned to you." }, { status: 403 });
  await logActivity({ organizationId: organization.id, userId: user.id, action: "status_changed", entityType: "Task", entityId: task.id, metadata: { status: parsed.data.payload.status, source: "guide" } });
  return NextResponse.json({ success: true, href: `/dashboard/projects/${task.projectId}/tasks/${task.id}` });
}
