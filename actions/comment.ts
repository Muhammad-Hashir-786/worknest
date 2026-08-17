"use server";

import { revalidatePath } from "next/cache";
import { requireOrgContext } from "~/lib/auth/current-org";
import { can } from "~/lib/permissions/permissions";
import { createCommentSchema, updateCommentSchema } from "~/lib/validations/comment";
import {
  createComment as createCommentRecord,
  updateComment as updateCommentRecord,
  deleteComment as deleteCommentRecord,
} from "~/services/comment";
import { logActivity } from "~/services/activity";

export interface CommentActionState {
  error?: string;
  fieldErrors?: Partial<Record<string, string>>;
  success?: boolean;
}

function fieldErrorsFrom(error: { path: PropertyKey[]; message: string }[]) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error) {
    const key = issue.path[0]?.toString();
    if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

function taskPath(projectId: string, taskId: string): string {
  return `/dashboard/projects/${projectId}/tasks/${taskId}`;
}

function readIds(formData: FormData): { taskId: string; projectId: string } | null {
  const taskId = formData.get("taskId");
  const projectId = formData.get("projectId");
  if (typeof taskId !== "string" || !taskId || typeof projectId !== "string" || !projectId) {
    return null;
  }
  return { taskId, projectId };
}

export async function createComment(
  _prevState: CommentActionState,
  formData: FormData
): Promise<CommentActionState> {
  const { organization, role, user } = await requireOrgContext();

  const ids = readIds(formData);
  if (!ids) return { error: "Task not found." };

  if (!can(role, "tasks:comment")) {
    return { error: "You don't have permission to do this." };
  }

  const parsed = createCommentSchema.safeParse({ content: formData.get("content") });
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }

  const result = await createCommentRecord({
    taskId: ids.taskId,
    organizationId: organization.id,
    userId: user.id,
    content: parsed.data.content,
  });

  if (!result.ok) return { error: result.error };

  // Logged against the Task (not the Comment) since there's no comment
  // detail page to link to - the feed line reads "commented on <task>".
  await logActivity({
    organizationId: organization.id,
    userId: user.id,
    action: "commented",
    entityType: "Task",
    entityId: ids.taskId,
    metadata: { excerpt: parsed.data.content.slice(0, 120) },
  });

  revalidatePath(taskPath(ids.projectId, ids.taskId));
  return { success: true };
}

export async function updateComment(
  _prevState: CommentActionState,
  formData: FormData
): Promise<CommentActionState> {
  const { organization, user } = await requireOrgContext();

  const ids = readIds(formData);
  const commentId = formData.get("commentId");
  if (!ids || typeof commentId !== "string" || !commentId) {
    return { error: "Comment not found." };
  }

  const parsed = updateCommentSchema.safeParse({ content: formData.get("content") });
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }

  // No permission-table check here on purpose - authorship (verified inside
  // updateCommentRecord's query filter) is the only thing that grants edit
  // rights, regardless of role. See the note on services/comment.ts.
  const result = await updateCommentRecord(
    commentId,
    ids.taskId,
    organization.id,
    user.id,
    parsed.data.content
  );

  if (!result.ok) return { error: result.error };

  revalidatePath(taskPath(ids.projectId, ids.taskId));
  return { success: true };
}

export async function deleteComment(formData: FormData): Promise<void> {
  const { organization, role, user } = await requireOrgContext();

  const ids = readIds(formData);
  const commentId = formData.get("commentId");
  if (!ids || typeof commentId !== "string" || !commentId) return;

  // Authors can always delete their own comment; tasks:delete additionally
  // lets managers/admins/owners moderate (delete) anyone's comment.
  const canModerate = can(role, "tasks:delete");
  await deleteCommentRecord(commentId, ids.taskId, organization.id, user.id, canModerate);

  revalidatePath(taskPath(ids.projectId, ids.taskId));
}
