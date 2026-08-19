"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { label: string; href: string; badge?: number; icon: string; section?: string };
function Mark({ icon }: { icon: string }) { return <span className="grid h-8 w-8 place-items-center rounded-xl bg-white/[0.06] text-[11px] font-bold text-neutral-400 transition group-hover:bg-white/10 group-hover:text-white">{icon}</span>; }

export default function SidebarNav({ items }: { items: Item[] }) {
  const pathname = usePathname();
  return <nav aria-label="Workspace navigation" className="dashboard-nav mt-4 -mx-1 flex snap-x gap-1 overflow-x-auto overscroll-x-contain px-1 pb-1 [scrollbar-width:none] [-ms-overflow-style:none] lg:mt-8 lg:block lg:overflow-visible lg:pb-0">{items.map((item, index) => {
    const active = item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href);
    const showSection = item.section && (index === 0 || item.section !== items[index - 1]?.section);
    return <div key={item.href} className="shrink-0 lg:mt-1">{showSection && <p className="mb-2 mt-6 hidden px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-600 lg:block">{item.section}</p>}<Link href={item.href} aria-current={active ? "page" : undefined} className={`group flex snap-start items-center gap-2 rounded-2xl px-2 py-2 text-xs font-semibold transition-all duration-200 sm:gap-3 sm:px-3 sm:text-sm ${active ? "bg-[#d92d27] text-white shadow-lg shadow-red-950/30" : "text-neutral-400 hover:bg-white/[0.07] hover:text-white"}`}><Mark icon={item.icon}/><span>{item.label}</span>{item.badge ? <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] ${active ? "bg-white/20" : "bg-white/10 text-neutral-300"}`}>{item.badge}</span> : null}</Link></div>;
  })}</nav>;
}
