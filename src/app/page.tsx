import { redirect } from "next/navigation";
import { getCurrentOrgContext } from "~/lib/auth/current-org";

export default async function Home() {
  const context = await getCurrentOrgContext();
  if (!context) redirect("/login");
  redirect(context.organization ? "/dashboard" : "/onboarding");
}
