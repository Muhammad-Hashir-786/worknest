import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireOrgContext } from "~/lib/auth/current-org";
import { can } from "~/lib/permissions/permissions";
import NewClientForm from "./new-client-form";

export const metadata: Metadata = { title: "New client - WorkNest" };

export default async function NewClientPage() {
  const { role } = await requireOrgContext();

  if (!can(role, "clients:manage")) {
    redirect("/dashboard/clients");
  }

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-semibold text-neutral-900">New client</h1>
      <NewClientForm />
    </div>
  );
}
