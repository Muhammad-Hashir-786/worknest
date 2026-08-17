import Link from "next/link";
import type { ClientSummary } from "~/services/client";

export default function ClientCard({ client }: { client: ClientSummary }) {
  return (
    <Link
      href={`/dashboard/clients/${client.id}`}
      className="worknest-panel block rounded-2xl border border-neutral-200 bg-white p-5 transition duration-200 hover:-translate-y-0.5 hover:border-red-200 hover:shadow-lg"
    >
      <h3 className="font-medium text-neutral-900">{client.name}</h3>
      <p className="mt-1 text-sm text-neutral-500">{client.company || "No company"}</p>

      <div className="mt-4 space-y-1 text-xs text-neutral-500">
        {client.email && <p className="truncate">{client.email}</p>}
        {client.phone && <p>{client.phone}</p>}
      </div>

      <p className="mt-3 text-xs text-neutral-400">
        {client.projectCount} project{client.projectCount === 1 ? "" : "s"}
      </p>
    </Link>
  );
}
