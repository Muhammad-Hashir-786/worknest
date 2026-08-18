import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentOrgContext } from "~/lib/auth/current-org";
import { can } from "~/lib/permissions/permissions";
import { createTask, changeTaskStatus, getTaskForOrg } from "~/services/task";
import { getProjectForOrg } from "~/services/project";
import { logActivity } from "~/services/activity";

const schema = z.discriminatedUnion("type", [z.object({ type: z.literal("create_task"), payload: z.object({ projectId: z.string(), title: z.string().trim().min(1).max(200) }) }), z.object({ type: z.literal("change_status"), payload: z.object({ taskId: z.string(), projectId: z.string(), status: z.enum(["todo", "in_progress", "in_review", "completed"]) }) })]);

export async function POST(request: Request) {
  const context = await getCurrentOrgContext(); if (!context?.organization) return NextResponse.json({ error: "Sign in to use Guide actions." }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "That action is not valid." }, { status: 400 });
  const { organization, user, role } = context;
  if (!role) return NextResponse.json({ error: "You are not an active workspace member." }, { status: 403 });
  if (parsed.data.type === "create_task") { if (!can(role, "tasks:create")) return NextResponse.json({ error: "You don't have permission to create tasks." }, { status: 403 }); const project = await getProjectForOrg(parsed.data.payload.projectId, organization.id); if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 }); const task = await createTask({ projectId: project.id, organizationId: organization.id, createdBy: user.id, title: parsed.data.payload.title, description: "", priority: "medium", recurrence: "none" }); await logActivity({ organizationId: organization.id, userId: user.id, action: "created", entityType: "Task", entityId: task.id, metadata: { title: parsed.data.payload.title, source: "guide" } }); return NextResponse.json({ success: true, href: `/dashboard/projects/${project.id}/tasks/${task.id}` }); }
  if (!can(role, "tasks:update")) return NextResponse.json({ error: "You don't have permission to update tasks." }, { status: 403 }); const task = await getTaskForOrg(parsed.data.payload.taskId, organization.id); if (!task || task.projectId !== parsed.data.payload.projectId) return NextResponse.json({ error: "Task not found." }, { status: 404 }); const restrict = can(role, "tasks:assign") ? undefined : user.id; const changed = await changeTaskStatus(parsed.data.payload.taskId, organization.id, parsed.data.payload.status, restrict); if (!changed) return NextResponse.json({ error: "You can only update tasks assigned to you." }, { status: 403 }); await logActivity({ organizationId: organization.id, userId: user.id, action: "status_changed", entityType: "Task", entityId: task.id, metadata: { status: parsed.data.payload.status, source: "guide" } }); return NextResponse.json({ success: true, href: `/dashboard/projects/${task.projectId}/tasks/${task.id}` });
}
