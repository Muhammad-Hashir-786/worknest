import type { ReactNode } from "react";

export default function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: ReactNode; action?: ReactNode }) {
  return <div className="relative flex flex-col gap-4 overflow-hidden border-b border-neutral-200 pb-6 sm:gap-5 sm:pb-7 md:flex-row md:items-end md:justify-between"><div className="relative min-w-0"><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#d92d27]">{eyebrow ?? "Workspace"}</p><h1 className="mt-2 text-3xl font-bold tracking-[-0.04em] text-neutral-950 sm:text-4xl">{title}</h1>{description && <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">{description}</p>}</div>{action && <div className="relative w-full shrink-0 md:w-auto">{action}</div>}<span className="pointer-events-none absolute -right-12 -top-16 h-36 w-36 rounded-full bg-red-100/60 blur-3xl" /></div>;
}
