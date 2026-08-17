import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOrgContext } from "~/lib/auth/current-org";
import { can } from "~/lib/permissions/permissions";
import { getClientForOrg, getProjectsForClient } from "~/services/client";
import ClientEditForm from "./client-edit-form";
import DeleteClientForm from "./delete-client-form";

const STATUS_STYLES: Record<string, string> = {
  planning: "bg-neutral-100 text-neutral-700",
  active: "bg-green-100 text-green-700",
  on_hold: "bg-amber-100 text-amber-700",
  completed: "bg-blue-100 text-blue-700",
  archived: "bg-neutral-100 text-neutral-500",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ clientId: string }>;
}): Promise<Metadata> {
  const { clientId } = await params;
  return { title: `Client ${clientId} - WorkNest` };
}

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { clientId } = await params;
  const { error: deleteError } = await searchParams;
  const { organization, role } = await requireOrgContext();

  // getClientForOrg only returns a result if the client belongs to the
  // caller's active organization - a client id from another org 404s here
  // exactly the same as one that doesn't exist at all.
  const client = await getClientForOrg(clientId, organization.id);
  if (!client) notFound();

  const canManage = can(role, "clients:manage");
  const projects = await getProjectsForClient(clientId, organization.id);

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <p className="text-sm text-neutral-500">Client since {new Date(client.createdAt).toLocaleDateString()}</p>
        <h1 className="mt-1 text-2xl font-semibold text-neutral-900">{client.name}</h1>
      </div>

      <section>
        <h2 className="text-sm font-medium text-neutral-900">Client details</h2>
        <div className="mt-2">
          <ClientEditForm client={client} canEdit={canManage} />
        </div>
      </section>

      <section>
        <h2 className="text-sm font-medium text-neutral-900">
          Projects ({projects.length})
        </h2>
        <div className="mt-2">
          {projects.length === 0 ? (
            <p className="rounded-md border border-dashed border-neutral-300 py-8 text-center text-sm text-neutral-500">
              No projects for this client yet.
            </p>
          ) : (
            <div className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/dashboard/projects/${project.id}`}
                  className="flex items-center justify-between px-4 py-3 text-sm hover:bg-neutral-50"
                >
                  <span className="font-medium text-neutral-900">{project.name}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[project.status]}`}
                  >
                    {project.status.replace("_", " ")}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {canManage && (
        <section className="border-t border-neutral-200 pt-6">
          <h2 className="text-sm font-medium text-red-600">Danger zone</h2>
          <p className="mt-1 text-sm text-neutral-600">
            {projects.length > 0
              ? "This client can't be deleted while it's linked to projects."
              : "Deleting a client permanently removes it."}
          </p>
          {typeof deleteError === "string" && (
            <p className="mt-2 text-sm text-red-600">{deleteError}</p>
          )}
          <div className="mt-2">
            <DeleteClientForm
              clientId={client.id}
              clientName={client.name}
              disabled={projects.length > 0}
            />
          </div>
        </section>
      )}
    </div>
  );
}
