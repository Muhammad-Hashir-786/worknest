"use client";

import { useActionState, useRef, useState } from "react";
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
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState("");

  function setFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file || !inputRef.current) return;
    const transfer = new DataTransfer(); transfer.items.add(file); inputRef.current.files = transfer.files; setFileName(file.name);
  }

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="taskId" value={taskId} />
      <input type="hidden" name="projectId" value={projectId} />
      <label onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); setFiles(event.dataTransfer.files); }} className={`flex cursor-pointer items-center justify-center rounded-xl border border-dashed px-4 py-4 text-center text-sm transition ${dragging ? "border-[#d92d27] bg-red-50 text-[#b42318]" : "border-neutral-300 bg-neutral-50 text-neutral-500 hover:border-neutral-400"}`}><span>{fileName ? <><strong className="text-neutral-800">{fileName}</strong><span className="mt-1 block text-xs text-neutral-400">Ready to upload</span></> : <>Drop a file here or <strong className="ml-1 text-[#d92d27]">browse</strong><span className="mt-1 block text-xs text-neutral-400">Up to 15MB</span></>}</span><input ref={inputRef} name="file" type="file" required onChange={(event) => setFiles(event.target.files)} className="sr-only" /></label>
      <button type="submit" disabled={pending || !fileName} className="rounded-xl border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-50">{pending ? "Uploading..." : "Upload file"}</button>
      {state.error && <span className="text-xs text-red-600">{state.error}</span>}
    </form>
  );
}
