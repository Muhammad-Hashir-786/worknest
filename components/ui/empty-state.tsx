import type { ReactNode } from "react";

export default function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="worknest-panel rounded-2xl border border-dashed border-neutral-300 bg-white px-6 py-16 text-center"><div className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-red-50 text-lg font-bold text-[#d92d27]">+</div><h2 className="mt-4 font-semibold text-neutral-900">{title}</h2><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-neutral-500">{description}</p>{action && <div className="mt-5">{action}</div>}</div>;
}
