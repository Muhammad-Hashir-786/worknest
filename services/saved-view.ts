import "server-only";
import connectDB from "~/lib/db";
import SavedView from "~/models/saved_view";

export interface SavedViewSummary { id: string; name: string; view: "list" | "board" | "calendar"; filters: Record<string, string>; }

export async function getSavedViews(organizationId: string, projectId: string, userId: string): Promise<SavedViewSummary[]> {
  await connectDB();
  const rows = await SavedView.find({ organization: organizationId, project: projectId, user: userId }).sort({ name: 1 }).lean();
  return rows.map((row) => ({ id: row._id.toString(), name: row.name, view: row.view, filters: (row.filters ?? {}) as Record<string, string> }));
}

export async function createSavedView(organizationId: string, projectId: string, userId: string, name: string, view: SavedViewSummary["view"], filters: Record<string, string>) {
  await connectDB();
  const row = await SavedView.findOneAndUpdate(
    { organization: organizationId, project: projectId, user: userId, name },
    { $set: { filters, view } }, { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );
  return row._id.toString();
}

export async function deleteSavedView(id: string, organizationId: string, projectId: string, userId: string) {
  await connectDB();
  await SavedView.deleteOne({ _id: id, organization: organizationId, project: projectId, user: userId });
}
