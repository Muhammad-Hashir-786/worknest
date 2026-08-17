import "server-only";
import { isValidObjectId } from "mongoose";
import connectDB from "../lib/db";
import Comment from "../models/comments";
import Task from "../models/tasks";

export interface CommentSummary {
  id: string;
  content: string;
  user: { id: string; name: string; avatar: string };
  createdAt: Date;
  edited: boolean;
}

/**
 * Confirms a task belongs to the caller's organization before any comment
 * operation touches it - the same indirect-org-check pattern used for
 * subtasks in services/task.ts, since comments don't carry an organization
 * field of their own.
 */
async function taskBelongsToOrg(taskId: string, organizationId: string): Promise<boolean> {
  if (!isValidObjectId(taskId)) return false;
  await connectDB();
  return Boolean(await Task.exists({ _id: taskId, organization: organizationId }));
}

export async function getCommentsForTask(
  taskId: string,
  organizationId: string
): Promise<CommentSummary[]> {
  if (!(await taskBelongsToOrg(taskId, organizationId))) return [];

  const comments = await Comment.find({ task: taskId })
    .populate("user", "name avatar")
    .sort({ createdAt: 1 })
    .lean();

  return comments
    .filter(
      (comment): comment is typeof comment & { user: NonNullable<typeof comment.user> } =>
        Boolean(comment.user) // defensive: skip comments left by a since-deleted user
    )
    .map((comment) => {
      const user = comment.user as unknown as {
        _id: { toString(): string };
        name: string;
        avatar: string;
      };
      return {
        id: comment._id.toString(),
        content: comment.content,
        user: { id: user._id.toString(), name: user.name, avatar: user.avatar },
        createdAt: comment.createdAt,
        edited: comment.updatedAt.getTime() > comment.createdAt.getTime(),
      };
    });
}

type CommentResult = { ok: true; id: string } | { ok: false; error: string };

export async function createComment(params: {
  taskId: string;
  organizationId: string;
  userId: string;
  content: string;
}): Promise<CommentResult> {
  if (!(await taskBelongsToOrg(params.taskId, params.organizationId))) {
    return { ok: false, error: "Task not found." };
  }

  const comment = await Comment.create({
    task: params.taskId,
    user: params.userId,
    content: params.content,
  });

  return { ok: true, id: comment._id.toString() };
}

type MutationResult = { ok: true } | { ok: false; error: string };

/**
 * Authorship is the ONLY thing that grants edit rights - folded directly
 * into the update filter rather than checked separately, so there's no way
 * to accidentally skip it. Even an org owner cannot rewrite someone else's
 * comment; deleteComment below has a separate moderation path for removing
 * (not editing) other people's comments.
 */
export async function updateComment(
  commentId: string,
  taskId: string,
  organizationId: string,
  requesterId: string,
  content: string
): Promise<MutationResult> {
  if (!isValidObjectId(commentId)) return { ok: false, error: "Comment not found." };
  if (!(await taskBelongsToOrg(taskId, organizationId))) {
    return { ok: false, error: "Task not found." };
  }

  const result = await Comment.findOneAndUpdate(
    { _id: commentId, task: taskId, user: requesterId },
    { content }
  );

  return result ? { ok: true } : { ok: false, error: "You can only edit your own comments." };
}

/**
 * canModerate lets managers/admins/owners (via the tasks:delete permission
 * - see actions/comment.ts) delete anyone's comment; everyone else may
 * only delete their own.
 */
export async function deleteComment(
  commentId: string,
  taskId: string,
  organizationId: string,
  requesterId: string,
  canModerate: boolean
): Promise<MutationResult> {
  if (!isValidObjectId(commentId)) return { ok: false, error: "Comment not found." };
  if (!(await taskBelongsToOrg(taskId, organizationId))) {
    return { ok: false, error: "Task not found." };
  }

  const filter: Record<string, unknown> = { _id: commentId, task: taskId };
  if (!canModerate) filter.user = requesterId;

  const result = await Comment.findOneAndDelete(filter);
  return result ? { ok: true } : { ok: false, error: "Comment not found." };
}
