import "server-only";
import { isValidObjectId } from "mongoose";
import connectDB from "../lib/db";
import Attachment from "../models/attachment";
import "../models/user";
import Task from "../models/tasks";
import { saveFile, deleteFileByKey } from "./storage";

export const MAX_ATTACHMENT_SIZE_BYTES = 15 * 1024 * 1024; // 15MB

export interface AttachmentSummary {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  uploadedBy: { id: string; name: string } | null;
  createdAt: Date;
}
export interface ProjectAttachmentSummary extends AttachmentSummary { taskId: string; taskTitle: string; }

async function taskBelongsToOrg(taskId: string, organizationId: string): Promise<boolean> {
  if (!isValidObjectId(taskId)) return false;
  await connectDB();
  return Boolean(await Task.exists({ _id: taskId, organization: organizationId }));
}

export async function getAttachmentsForTask(
  taskId: string,
  organizationId: string
): Promise<AttachmentSummary[]> {
  if (!(await taskBelongsToOrg(taskId, organizationId))) return [];

  const attachments = await Attachment.find({ task: taskId })
    .populate("uploadedBy", "name")
    .sort({ createdAt: -1 })
    .lean();

  return attachments.map((attachment) => {
    const uploadedBy = attachment.uploadedBy as unknown as
      | { _id: { toString(): string }; name: string }
      | null;
    return {
      id: attachment._id.toString(),
      name: attachment.name,
      size: attachment.size,
      mimeType: attachment.mimeType,
      uploadedBy: uploadedBy ? { id: uploadedBy._id.toString(), name: uploadedBy.name } : null,
      createdAt: attachment.createdAt,
    };
  });
}

export async function getAttachmentsForProject(projectId: string, organizationId: string): Promise<ProjectAttachmentSummary[]> {
  await connectDB();
  const tasks = await Task.find({ project: projectId, organization: organizationId }).select("_id title").lean();
  if (!tasks.length) return [];
  const taskTitles = new Map(tasks.map((task) => [task._id.toString(), task.title]));
  const rows = await Attachment.find({ task: { $in: tasks.map((task) => task._id) } }).populate("uploadedBy", "name").sort({ createdAt: -1 }).lean();
  return rows.map((attachment) => { const uploadedBy = attachment.uploadedBy as unknown as { _id: { toString(): string }; name: string } | null; const taskId = attachment.task.toString(); return { id: attachment._id.toString(), name: attachment.name, size: attachment.size, mimeType: attachment.mimeType, uploadedBy: uploadedBy ? { id: uploadedBy._id.toString(), name: uploadedBy.name } : null, createdAt: attachment.createdAt, taskId, taskTitle: taskTitles.get(taskId) ?? "Task" }; });
}

type UploadResult = { ok: true; id: string } | { ok: false; error: string };

export async function uploadAttachment(params: {
  taskId: string;
  organizationId: string;
  uploadedBy: string;
  file: File;
}): Promise<UploadResult> {
  if (!(await taskBelongsToOrg(params.taskId, params.organizationId))) {
    return { ok: false, error: "Task not found." };
  }

  if (params.file.size === 0) {
    return { ok: false, error: "The selected file is empty." };
  }
  if (params.file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    return { ok: false, error: "Files must be 15MB or smaller." };
  }

  const buffer = Buffer.from(await params.file.arrayBuffer());
  const stored = await saveFile(buffer, params.file.name);

  const attachment = await Attachment.create({
    task: params.taskId,
    uploadedBy: params.uploadedBy,
    name: params.file.name.slice(0, 255),
    // Filled in immediately below - the download URL needs the document's
    // own _id, which only exists after this initial create().
    url: "pending",
    size: params.file.size,
    mimeType: params.file.type || "application/octet-stream",
    storageKey: stored.storageKey,
  });

  attachment.url = `/api/attachments/${attachment._id.toString()}/download`;
  await attachment.save();

  return { ok: true, id: attachment._id.toString() };
}

export interface AttachmentForDownload {
  storageKey: string;
  name: string;
  mimeType: string;
  organizationId: string;
}

/**
 * Loads what the download route handler needs, including the organization
 * the attachment's task belongs to. The route handler is what actually
 * compares that against the requester's own organization before any bytes
 * get streamed - this function just makes that comparison possible.
 */
export async function getAttachmentForDownload(
  attachmentId: string
): Promise<AttachmentForDownload | null> {
  if (!isValidObjectId(attachmentId)) return null;

  await connectDB();

  const attachment = await Attachment.findById(attachmentId)
    .populate("task", "organization")
    .lean();

  if (!attachment) return null;

  const task = (attachment as unknown as Record<string, unknown>).task as {
    organization: { toString(): string };
  } | null;
  if (!task) return null;

  return {
    storageKey: (attachment as unknown as { storageKey: string }).storageKey,
    name: (attachment as unknown as { name: string }).name,
    mimeType: (attachment as unknown as { mimeType: string }).mimeType,
    organizationId: task.organization.toString(),
  };
}

type DeleteResult = { ok: true } | { ok: false; error: string };

/**
 * canModerate lets managers/admins/owners (via tasks:delete - see
 * actions/attachment.ts) remove any attachment; everyone else may only
 * remove ones they uploaded themselves.
 */
export async function deleteAttachment(
  attachmentId: string,
  taskId: string,
  organizationId: string,
  requesterId: string,
  canModerate: boolean
): Promise<DeleteResult> {
  if (!isValidObjectId(attachmentId)) return { ok: false, error: "Attachment not found." };
  if (!(await taskBelongsToOrg(taskId, organizationId))) {
    return { ok: false, error: "Task not found." };
  }

  const attachment = await Attachment.findOne({ _id: attachmentId, task: taskId });
  if (!attachment) return { ok: false, error: "Attachment not found." };

  if (attachment.uploadedBy.toString() !== requesterId && !canModerate) {
    return { ok: false, error: "You can only delete files you uploaded." };
  }

  await deleteFileByKey(attachment.storageKey);
  await attachment.deleteOne();

  return { ok: true };
}
