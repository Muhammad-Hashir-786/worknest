import "server-only";
import { isValidObjectId } from "mongoose";
import connectDB from "~/lib/db";
import Notification from "~/models/notifications";
import type { NotificationType } from "~/lib/constants/roles";

export interface NotificationSummary {
  id: string;
  type: NotificationType;
  message: string;
  read: boolean;
  relatedTaskId: string | null;
  relatedProjectId: string | null;
  createdAt: Date;
}

export async function createNotification(params: {
  userId: string;
  organizationId: string;
  type: NotificationType;
  message: string;
  relatedTaskId?: string;
  relatedProjectId?: string;
}): Promise<void> {
  await connectDB();
  await Notification.create({
    user: params.userId,
    organization: params.organizationId,
    type: params.type,
    message: params.message,
    relatedTask: params.relatedTaskId,
    relatedProject: params.relatedProjectId,
  });
}

export async function getNotificationsForUser(
  userId: string,
  organizationId: string
): Promise<NotificationSummary[]> {
  await connectDB();
  const notifications = await Notification.find({ user: userId, organization: organizationId })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  return notifications.map((notification) => ({
    id: notification._id.toString(),
    type: notification.type as NotificationType,
    message: notification.message,
    read: notification.read,
    relatedTaskId: notification.relatedTask?.toString() ?? null,
    relatedProjectId: notification.relatedProject?.toString() ?? null,
    createdAt: notification.createdAt,
  }));
}

export async function getUnreadNotificationCount(userId: string, organizationId: string): Promise<number> {
  await connectDB();
  return Notification.countDocuments({ user: userId, organization: organizationId, read: false });
}

export async function markNotificationRead(
  notificationId: string,
  userId: string,
  organizationId: string
): Promise<boolean> {
  if (!isValidObjectId(notificationId)) return false;
  await connectDB();
  return Boolean(await Notification.findOneAndUpdate(
    { _id: notificationId, user: userId, organization: organizationId },
    { read: true }
  ));
}

export async function markAllNotificationsRead(userId: string, organizationId: string): Promise<void> {
  await connectDB();
  await Notification.updateMany({ user: userId, organization: organizationId, read: false }, { read: true });
}
