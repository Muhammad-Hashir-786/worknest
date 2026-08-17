import type { Metadata } from "next";
import Link from "next/link";
import { requireOrgContext } from "~/lib/auth/current-org";
import { can } from "~/lib/permissions/permissions";
import { getClientsList } from "~/services/client";
import { clientFiltersSchema } from "~/lib/validations/client";
import ClientFilters from "./client-filters";
import ClientCard from "./client-card";
import PageHeader from "~/components/ui/page-header";
import EmptyState from "~/components/ui/empty-state";

export const metadata: Metadata = { title: "Clients - WorkNest" };

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { organization, role } = await requireOrgContext();
  const params = await searchParams;

  const filters = clientFiltersSchema.parse({
    search: firstValue(params.search),
  });

  const clients = await getClientsList(organization.id, filters);
  const canCreate = can(role, "clients:manage");

  return (
    <div className="space-y-6">
      <PageHeader title="Clients" description={`${clients.length} client${clients.length === 1 ? "" : "s"} in ${organization.name}.`} action={canCreate && (
          <Link
            href="/dashboard/clients/new"
            className="rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm"
          >
            + New client
          </Link>
        )}/>

      <ClientFilters initialFilters={filters} />

      {clients.length === 0 ? (
        <EmptyClients hasFilters={Boolean(filters.search)} canCreate={canCreate} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <ClientCard key={client.id} client={client} />
          ))}
        </div>
      )}
    </div>
  );
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function EmptyClients({ hasFilters, canCreate }: { hasFilters: boolean; canCreate: boolean }) {
  return <EmptyState title={hasFilters ? "No matching clients" : "Start building your client list"} description={hasFilters ? "Try another name, company, or email address." : "Add a client now, or create one while setting up a project."} action={!hasFilters && canCreate ? <Link href="/dashboard/clients/new" className="inline-flex rounded-lg bg-[#d92d27] px-4 py-2 text-sm font-semibold text-white">Add client</Link> : undefined} />;
}
