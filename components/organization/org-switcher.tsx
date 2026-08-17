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
        className="flex w-full items-center justify-between gap-1 rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-left text-sm font-medium text-white hover:bg-neutral-700"
      >
        {current.name}
        <span className="text-neutral-400">▾</span>
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
