import "server-only";
import connectDB from "~/lib/db";
import NotificationPreference from "~/models/notification_preferences";

export interface NotificationPreferences { taskAssignments: boolean; statusChanges: boolean; comments: boolean; deadlines: boolean; emailUpdates: boolean; }
const defaults: NotificationPreferences = { taskAssignments: true, statusChanges: true, comments: true, deadlines: true, emailUpdates: false };

export async function getNotificationPreferences(userId: string, organizationId: string): Promise<NotificationPreferences> {
  await connectDB();
  const row = await NotificationPreference.findOne({ user: userId, organization: organizationId }).lean();
  return row ? { taskAssignments: row.taskAssignments, statusChanges: row.statusChanges, comments: row.comments, deadlines: row.deadlines, emailUpdates: row.emailUpdates } : defaults;
}

export async function saveNotificationPreferences(userId: string, organizationId: string, preferences: NotificationPreferences): Promise<void> {
  await connectDB();
  await NotificationPreference.findOneAndUpdate({ user: userId, organization: organizationId }, { ...preferences }, { upsert: true, setDefaultsOnInsert: true });
}
