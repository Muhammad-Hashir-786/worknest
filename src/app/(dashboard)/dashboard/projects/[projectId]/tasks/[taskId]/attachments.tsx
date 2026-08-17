"use client";

import { useActionState } from "react";
import { uploadAttachment, deleteAttachment, type AttachmentActionState } from "~/actions/attachment";
import type { AttachmentSummary } from "~/services/attachment";

const initialState: AttachmentActionState = {};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Attachments({
  taskId,
  projectId,
  attachments,
  currentUserId,
  canUpload,
  canModerate,
}: {
  taskId: string;
  projectId: string;
  attachments: AttachmentSummary[];
  currentUserId: string;
  canUpload: boolean;
  canModerate: boolean;
}) {
  return (
    <div className="space-y-3">
      {attachments.length === 0 ? (
        <p className="text-sm text-neutral-500">No files attached.</p>
      ) : (
        <ul className="divide-y divide-neutral-100 rounded-md border border-neutral-200">
          {attachments.map((attachment) => {
            const canDelete =
              canModerate || attachment.uploadedBy?.id === currentUserId;
            return (
              <li key={attachment.id} className="flex items-center gap-3 px-3 py-2">
                <a
                  href={`/api/attachments/${attachment.id}/download`}
                  className="min-w-0 flex-1 truncate text-sm text-neutral-900 hover:underline"
                >
                  {attachment.name}
                </a>
                <span className="shrink-0 text-xs text-neutral-400">
                  {formatBytes(attachment.size)}
                </span>
                <span className="shrink-0 text-xs text-neutral-400">
                  {attachment.uploadedBy?.name ?? "Unknown"}
                </span>
                {canDelete && (
                  <form action={deleteAttachment}>
                    <input type="hidden" name="taskId" value={taskId} />
                    <input type="hidden" name="projectId" value={projectId} />
                    <input type="hidden" name="attachmentId" value={attachment.id} />
                    <button
                      type="submit"
                      className="shrink-0 text-xs text-red-600 hover:text-red-700"
                    >
                      Delete
                    </button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {canUpload && <UploadForm taskId={taskId} projectId={projectId} />}
    </div>
  );
}

function UploadForm({ taskId, projectId }: { taskId: string; projectId: string }) {
  const [state, formAction, pending] = useActionState(uploadAttachment, initialState);

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="taskId" value={taskId} />
      <input type="hidden" name="projectId" value={projectId} />
      <input
        name="file"
        type="file"
        required
        className="flex-1 text-sm text-neutral-700 file:mr-3 file:rounded-md file:border-0 file:bg-neutral-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-neutral-700 hover:file:bg-neutral-200"
      />
      <button
        type="submit"
        disabled={pending}
        className="shrink-0 rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-50"
      >
        {pending ? "Uploading..." : "Upload"}
      </button>
      {state.error && <span className="text-xs text-red-600">{state.error}</span>}
    </form>
  );
}
