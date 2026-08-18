"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { switchOrganization } from "../../actions/organization";
import type { OrgRole } from "../../lib/constants/roles";

interface OrgOption {
  id: string;
  name: string;
  role: OrgRole;
}

export default function OrgSwitcher({
  current,
  organizations,
}: {
  current: { id: string; name: string };
  organizations: OrgOption[];
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const otherOrganizations = organizations.filter((org) => org.id !== current.id);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-3 text-left text-sm font-medium text-white shadow-inner transition hover:border-white/20 hover:bg-white/10"
      >
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-red-500/15 text-xs font-bold text-red-200">{current.name.slice(0, 1).toUpperCase()}</span><span className="min-w-0 flex-1"><span className="block truncate">{current.name}</span><span className="mt-0.5 block text-[10px] font-normal uppercase tracking-wide text-neutral-500">Active workspace</span></span><span className="text-neutral-500">⌄</span>
      </button>

      {open && (
        <div className="absolute left-0 z-10 mt-1 w-56 rounded-md border border-neutral-200 bg-white py-1 shadow-lg">
          {otherOrganizations.length > 0 && (
            <div className="border-b border-neutral-100 py-1">
              {otherOrganizations.map((org) => (
                <form key={org.id} action={switchOrganization}>
                  <input type="hidden" name="organizationId" value={org.id} />
                  <button
                    type="submit"
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50"
                  >
                    <span>{org.name}</span>
                    <span className="text-xs uppercase text-neutral-400">{org.role}</span>
                  </button>
                </form>
              ))}
            </div>
          )}
          <Link
            href="/onboarding/create"
            className="block px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
            onClick={() => setOpen(false)}
          >
            + Create organization
          </Link>
        </div>
      )}
    </div>
  );
}
