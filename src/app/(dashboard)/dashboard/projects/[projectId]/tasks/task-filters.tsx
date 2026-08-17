"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { TASK_STATUS, PRIORITY } from "~/lib/constants/roles";
import type { ProjectMemberSummary } from "~/services/project";

interface Filters {
  status?: string;
  priority?: string;
  assignee?: string;
  search?: string;
}

/**
 * Same URL-driven filtering approach as ProjectFilters (see
 * projects/project-filters.tsx) - filters live in the query string so the
 * list stays server-rendered and the URL is shareable.
 */
export default function TaskFilters({
  initialFilters,
  members,
}: {
  initialFilters: Filters;
  members: ProjectMemberSummary[];
}) {
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
          placeholder="Search tasks..."
          className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm"
        />
      </form>

      <select
        defaultValue={initialFilters.status ?? ""}
        onChange={(event) => updateParam("status", event.target.value)}
        className="rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm font-medium text-neutral-700"
      >
        <option value="">All statuses</option>
        {TASK_STATUS.map((status) => (
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

      <select
        defaultValue={initialFilters.assignee ?? ""}
        onChange={(event) => updateParam("assignee", event.target.value)}
        className="rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm font-medium text-neutral-700"
      >
        <option value="">Everyone</option>
        <option value="me">Assigned to me</option>
        <option value="unassigned">Unassigned</option>
        {members.map((member) => (
          <option key={member.user.id} value={member.user.id}>
            {member.user.name}
          </option>
        ))}
      </select>
    </div>
  );
}
