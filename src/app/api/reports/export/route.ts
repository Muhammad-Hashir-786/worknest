import { NextResponse } from "next/server";
import { requireOrgContext } from "~/lib/auth/current-org";
import { getOrganizationReport } from "~/services/reporting";
import { makeReportPdf } from "~/lib/export/pdf";

function csvCell(value: string | number) { const text = String(value); return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text; }
export async function GET(request: Request) {
  const { organization } = await requireOrgContext();
  const report = await getOrganizationReport(organization.id);
  const format = new URL(request.url).searchParams.get("format");
  if (format === "pdf") {
    const lines = [
      `Organization: ${organization.name}`,
      `Logged hours: ${report.summary.loggedHours.toFixed(1)} | Estimated hours: ${report.summary.estimatedHours.toFixed(1)}`,
      `Budget: ${report.summary.budget.toFixed(2)} | Estimated spend: ${report.summary.spend.toFixed(2)}`,
      `Open tasks: ${report.summary.openTasks}`,
      "", "TEAM WORKLOAD",
      ...report.workload.map((row) => `${row.name}: ${row.assigned} open tasks, ${row.overdue} overdue, ${row.loggedHours.toFixed(1)}h logged / ${row.estimatedHours.toFixed(1)}h estimated`),
      "", "RECENT TIMESHEETS",
      ...report.timesheet.slice(0, 30).map((row) => `${row.date.toLocaleDateString()} - ${row.name} - ${row.project} / ${row.task}: ${row.hours.toFixed(2)}h`),
    ];
    return new NextResponse(makeReportPdf(`${organization.name} - Delivery report`, lines) as unknown as BodyInit, { headers: { "Content-Type": "application/pdf", "Content-Disposition": 'attachment; filename="worknest-delivery-report.pdf"' } });
  }
  const lines = [["Date", "Team member", "Project", "Task", "Hours"], ...report.timesheet.map((row) => [row.date.toISOString().slice(0, 10), row.name, row.project, row.task, row.hours.toFixed(2)])];
  return new NextResponse(lines.map((row) => row.map(csvCell).join(",")).join("\r\n"), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="worknest-timesheets.csv"' } });
}
