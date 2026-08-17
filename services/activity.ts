import "server-only";
import connectDB from "~/lib/db";
import ActivityLog from "~/models/activity";
import type { ActivityAction } from "~/lib/constants/roles";

/**
 * The entity types an activity log entry can point at. Kept in sync with
 * the enum on the ActivityLog model itself.
 */
export type ActivityEntityType =
  | "Task"
  | "Project"
  | "Client"
  | "Comment"
  | "Subtask"
  | "Organization"
  | "User";

/**
 * Writes one activity log entry. Fire-and-forget by design: callers await
 * it (so ordering with the surrounding transaction-less writes stays
 * predictable), but a failure here should never take down the action that
 * triggered it - logging is a side effect, not the primary operation.
 *
 * metadata is a small free-form bag for context that's cheap to capture at
 * write time but expensive to reconstruct later, e.g. { from: "todo", to:
 * "in_progress" } for a status change, or { title } for a deleted entity
 * (its own record won't exist anymore to look the title up from).
 */
export async function logActivity(params: {
  organizationId: string;
  userId: string;
  action: ActivityAction;
  entityType: ActivityEntityType;
  entityId: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await connectDB();
    await ActivityLog.create({
      organization: params.organizationId,
      user: params.userId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      metadata: params.metadata ?? {},
    });
  } catch (error) {
    // Never let a logging failure surface as a failure of the real
    // operation (creating a task, deleting a client, etc). Log server-side
    // and move on.
    console.error("logActivity failed:", error);
  }
}

export interface ActivityFeedEntry {
  id: string;
  action: ActivityAction;
  entityType: ActivityEntityType;
  entityId: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  user: {
    id: string;
    name: string;
    avatar: string;
  };
}

/**
 * Most recent activity for an organization, newest first. Used by the
 * dashboard activity feed. Populates just enough of the acting user
 * (name/avatar) to render a line like "Priya updated Task X" without a
 * second round trip per entry.
 */
export async function getRecentActivity(
  organizationId: string,
  limit = 20
): Promise<ActivityFeedEntry[]> {
  await connectDB();

  const entries = await ActivityLog.find({ organization: organizationId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("user", "name avatar")
    .lean();

  return entries.map((entry) => ({
    id: entry._id.toString(),
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId.toString(),
    metadata: entry.metadata ?? {},
    createdAt: entry.createdAt,
    user: {
      id: entry.user?._id?.toString() ?? "",
      name: entry.user?.name ?? "Unknown",
      avatar: entry.user?.avatar ?? "",
    },
  }));
}
