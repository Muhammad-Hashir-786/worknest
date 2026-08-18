import type { Metadata } from "next";
import { requireOrgContext } from "~/lib/auth/current-org";
import { getNotificationPreferences } from "~/services/notification-preferences";
import NotificationPreferencesForm from "./preferences-form";
import PageHeader from "~/components/ui/page-header";

export const metadata: Metadata = { title: "Notification settings - WorkNest" };

export default async function NotificationSettingsPage() {
  const { user, organization } = await requireOrgContext();
  const preferences = await getNotificationPreferences(user.id, organization.id);
  return <div className="max-w-3xl space-y-7"><PageHeader eyebrow="Personal settings" title="Notifications" description="Choose which workspace events should reach you. Your choices apply to this workspace only." /><NotificationPreferencesForm preferences={preferences} /></div>;
}
