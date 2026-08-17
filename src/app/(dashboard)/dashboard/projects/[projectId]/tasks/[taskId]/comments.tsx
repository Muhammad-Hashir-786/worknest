"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import {
  createComment,
  updateComment,
  deleteComment,
  type CommentActionState,
} from "~/actions/comment";
import type { CommentSummary } from "~/services/comment";

const initialState: CommentActionState = {};

export default function Comments({
  taskId,
  projectId,
  comments,
  currentUserId,
  canComment,
  canModerate,
}: {
  taskId: string;
  projectId: string;
  comments: CommentSummary[];
  currentUserId: string;
  canComment: boolean;
  canModerate: boolean;
}) {
  return (
    <div className="space-y-4">
      {comments.length === 0 ? (
        <p className="text-sm text-neutral-500">No comments yet.</p>
      ) : (
        <ul className="space-y-4">
          {comments.map((comment) => (
            <CommentRow
              key={comment.id}
              taskId={taskId}
              projectId={projectId}
              comment={comment}
              canEdit={comment.user.id === currentUserId}
              canDelete={comment.user.id === currentUserId || canModerate}
            />
          ))}
        </ul>
      )}

      {canComment && <AddCommentForm taskId={taskId} projectId={projectId} />}
    </div>
  );
}

function CommentRow({
  taskId,
  projectId,
  comment,
  canEdit,
  canDelete,
}: {
  taskId: string;
  projectId: string;
  comment: CommentSummary;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [state, formAction, pending] = useActionState(updateComment, initialState);

  // "Adjust state during render" (React's own recommended pattern for this
  // exact case) rather than an effect: a successful save should close the
  // edit form, but the action returned by useActionState schedules a
  // transition instead of being meaningfully awaitable by the caller, so
  // there's no other point to hook the close into. Tracked via a comparison
  // against the previous state.success rather than useEffect, since setState
  // synchronously inside an effect body triggers an avoidable extra render.
  const [prevSuccess, setPrevSuccess] = useState(state.success);
  if (state.success !== prevSuccess) {
    setPrevSuccess(state.success);
    if (state.success) setIsEditing(false);
  }

  if (isEditing) {
    return (
      <li>
        <form action={formAction} className="space-y-2">
          <input type="hidden" name="taskId" value={taskId} />
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="commentId" value={comment.id} />
          <textarea
            name="content"
            required
            defaultValue={comment.content}
            rows={3}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          />
          {state.fieldErrors?.content && (
            <p className="text-xs text-red-600">{state.fieldErrors.content}</p>
          )}
          {state.error && <p className="text-xs text-red-600">{state.error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
            >
              {pending ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100"
            >
              Cancel
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="flex gap-3">
      <Image
        src={comment.user.avatar}
        alt=""
        width={32}
        height={32}
        className="h-8 w-8 shrink-0 rounded-full object-cover"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-neutral-900">{comment.user.name}</span>
          <span className="text-xs text-neutral-400">
            {new Date(comment.createdAt).toLocaleString()}
            {comment.edited && " (edited)"}
          </span>
        </div>
        <p className="mt-0.5 whitespace-pre-wrap text-sm text-neutral-700">{comment.content}</p>

        {(canEdit || canDelete) && (
          <div className="mt-1 flex gap-3 text-xs text-neutral-500">
            {canEdit && (
              <button onClick={() => setIsEditing(true)} className="hover:text-neutral-900">
                Edit
              </button>
            )}
            {canDelete && (
              <form action={deleteComment}>
                <input type="hidden" name="taskId" value={taskId} />
                <input type="hidden" name="projectId" value={projectId} />
                <input type="hidden" name="commentId" value={comment.id} />
                <button type="submit" className="text-red-600 hover:text-red-700">
                  Delete
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

function AddCommentForm({ taskId, projectId }: { taskId: string; projectId: string }) {
  const [state, formAction, pending] = useActionState(createComment, initialState);

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="taskId" value={taskId} />
      <input type="hidden" name="projectId" value={projectId} />
      <textarea
        name="content"
        required
        rows={3}
        placeholder="Write a comment..."
        className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
      />
      {state.fieldErrors?.content && (
        <p className="text-xs text-red-600">{state.fieldErrors.content}</p>
      )}
      {state.error && <p className="text-xs text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {pending ? "Posting..." : "Comment"}
      </button>
    </form>
  );
}
