"use server";

import { revalidatePath } from "next/cache";
import { requireOrgContext } from "~/lib/auth/current-org";
import { getNotificationPreferences, saveNotificationPreferences, type NotificationPreferences } from "~/services/notification-preferences";

export async function saveNotificationPreferencesAction(_state: { success: boolean }, formData: FormData) {
  const { user, organization } = await requireOrgContext();
  const preferences: NotificationPreferences = { taskAssignments: formData.get("taskAssignments") === "on", statusChanges: formData.get("statusChanges") === "on", comments: formData.get("comments") === "on", deadlines: formData.get("deadlines") === "on", emailUpdates: formData.get("emailUpdates") === "on" };
  await saveNotificationPreferences(user.id, organization.id, preferences);
  revalidatePath("/dashboard/settings/notifications");
  return { success: true };
}

export { getNotificationPreferences };
