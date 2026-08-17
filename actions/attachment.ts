"use server";

import { revalidatePath } from "next/cache";
import { requireOrgContext } from "../lib/auth/current-org";
import { can } from "../lib/permissions/permissions";
import {
  uploadAttachment as uploadAttachmentRecord,
  deleteAttachment as deleteAttachmentRecord,
} from "../services/attachment";

export interface AttachmentActionState {
  error?: string;
  success?: boolean;
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

export async function uploadAttachment(
  _prevState: AttachmentActionState,
  formData: FormData
): Promise<AttachmentActionState> {
  const { organization, role, user } = await requireOrgContext();

  const ids = readIds(formData);
  if (!ids) return { error: "Task not found." };

  if (!can(role, "tasks:attach")) {
    return { error: "You don't have permission to do this." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a file to upload." };
  }

  const result = await uploadAttachmentRecord({
    taskId: ids.taskId,
    organizationId: organization.id,
    uploadedBy: user.id,
    file,
  });

  if (!result.ok) return { error: result.error };

  revalidatePath(taskPath(ids.projectId, ids.taskId));
  return { success: true };
}

export async function deleteAttachment(formData: FormData): Promise<void> {
  const { organization, role, user } = await requireOrgContext();

  const ids = readIds(formData);
  const attachmentId = formData.get("attachmentId");
  if (!ids || typeof attachmentId !== "string" || !attachmentId) return;

  // Uploaders can always delete their own file; tasks:delete additionally
  // lets managers/admins/owners remove anyone's attachment.
  const canModerate = can(role, "tasks:delete");
  await deleteAttachmentRecord(attachmentId, ids.taskId, organization.id, user.id, canModerate);

  revalidatePath(taskPath(ids.projectId, ids.taskId));
}
