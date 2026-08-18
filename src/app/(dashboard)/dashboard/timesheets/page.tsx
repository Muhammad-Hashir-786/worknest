import type { Metadata } from "next";
import { requireOrgContext } from "~/lib/auth/current-org";
import { getCurrentWeekTimesheet } from "~/services/time-entry";
import PageHeader from "~/components/ui/page-header";
import TimesheetWorkspace from "./timesheet-workspace";

export const metadata: Metadata = { title: "Timesheets - WorkNest" };
export default async function TimesheetsPage() { const { user, organization } = await requireOrgContext(); const data = await getCurrentWeekTimesheet(user.id, organization.id); return <div className="space-y-7"><PageHeader eyebrow="Time & delivery" title="Timesheets" description={`Your week of ${data.weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${new Date(data.weekEnd.getTime() - 1).toLocaleDateString(undefined, { month: "short", day: "numeric" })}.`} /><TimesheetWorkspace data={data} /></div>; }
