import { NextResponse } from "next/server";
import { getCurrentOrgContext } from "~/lib/auth/current-org";
import { searchOrganization } from "~/services/search";

export async function GET(request: Request) {
  const context = await getCurrentOrgContext();
  if (!context?.organization) return NextResponse.json({ error: "Sign in to search your workspace." }, { status: 401 });
  const query = new URL(request.url).searchParams.get("q") ?? "";
  return NextResponse.json({ results: await searchOrganization(context.organization.id, query) });
}
