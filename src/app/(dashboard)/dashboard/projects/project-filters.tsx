"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { PROJECT_STATUS, PRIORITY } from "~/lib/constants/roles";

interface Filters {
  status?: string;
  priority?: string;
  search?: string;
}

/**
 * Drives filtering entirely through the URL (?status=&priority=&search=)
 * rather than client-side state, so the filtered list is server-rendered,
 * shareable/bookmarkable, and works the same whether or not JS has loaded.
 */
export default function ProjectFilters({ initialFilters }: { initialFilters: Filters }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(initialFilters.search ?? "");
  const [, startTransition] = useTransition();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  function handleSearchSubmit(event: React.FormEvent) {
    event.preventDefault();
    updateParam("search", search);
  }

  return (
    <div className="worknest-panel flex flex-wrap items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-3">
      <form onSubmit={handleSearchSubmit} className="min-w-[200px] flex-1">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search projects..."
          className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm"
        />
      </form>

      <select
        defaultValue={initialFilters.status ?? ""}
        onChange={(event) => updateParam("status", event.target.value)}
        className="rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm font-medium text-neutral-700"
      >
        <option value="">All statuses</option>
        {PROJECT_STATUS.map((status) => (
          <option key={status} value={status}>
            {status.replace("_", " ")}
          </option>
        ))}
      </select>

      <select
        defaultValue={initialFilters.priority ?? ""}
        onChange={(event) => updateParam("priority", event.target.value)}
        className="rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm font-medium text-neutral-700"
      >
        <option value="">All priorities</option>
        {PRIORITY.map((priority) => (
          <option key={priority} value={priority}>
            {priority}
          </option>
        ))}
      </select>
    </div>
  );
}
