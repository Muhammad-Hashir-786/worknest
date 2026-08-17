import type { ReactNode } from "react";

export default function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: ReactNode; action?: ReactNode }) {
  return <div className="flex flex-col gap-4 border-b border-neutral-200 pb-6 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#d92d27]">{eyebrow ?? "Workspace"}</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-neutral-950">{title}</h1>{description && <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">{description}</p>}</div>{action && <div className="shrink-0">{action}</div>}</div>;
}
