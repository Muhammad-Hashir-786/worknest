import type { ReactNode } from "react";

export default function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: ReactNode; action?: ReactNode }) {
  return <div className="relative flex flex-col gap-5 overflow-hidden border-b border-neutral-200 pb-7 sm:flex-row sm:items-end sm:justify-between"><div className="relative"><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#d92d27]">{eyebrow ?? "Workspace"}</p><h1 className="mt-2 text-4xl font-bold tracking-[-0.04em] text-neutral-950">{title}</h1>{description && <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">{description}</p>}</div>{action && <div className="relative shrink-0">{action}</div>}<span className="pointer-events-none absolute -right-12 -top-16 h-36 w-36 rounded-full bg-red-100/60 blur-3xl" /></div>;
}
