"use server";

import { revalidatePath } from "next/cache";
import { requireOrgContext } from "~/lib/auth/current-org";
import { markAllNotificationsRead, markNotificationRead } from "~/services/notification";

export async function readNotification(formData: FormData): Promise<void> {
  const { user, organization } = await requireOrgContext();
  const notificationId = formData.get("notificationId");
  if (typeof notificationId === "string") {
    await markNotificationRead(notificationId, user.id, organization.id);
  }
  revalidatePath("/dashboard/notifications");
  revalidatePath("/dashboard", "layout");
}

export async function readAllNotifications(): Promise<void> {
  const { user, organization } = await requireOrgContext();
  await markAllNotificationsRead(user.id, organization.id);
  revalidatePath("/dashboard/notifications");
  revalidatePath("/dashboard", "layout");
}
