"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { label: string; href: string; badge?: number; icon: string };
function Mark({ icon }: { icon: string }) { return <span className="grid h-6 w-6 place-items-center rounded-md text-[11px] font-bold">{icon}</span>; }

export default function SidebarNav({ items }: { items: Item[] }) {
  const pathname = usePathname();
  return <nav className="mt-5 flex gap-1 overflow-x-auto lg:mt-8 lg:block lg:space-y-1">{items.map((item) => {
    const active = item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href);
    return <Link key={item.href} href={item.href} className={`group flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${active ? "bg-[#d92d27] text-white shadow-lg shadow-red-950/30" : "text-neutral-400 hover:bg-white/10 hover:text-white"}`}><Mark icon={item.icon}/><span>{item.label}</span>{item.badge ? <span className={`ml-auto rounded-full px-1.5 py-0.5 text-[10px] ${active ? "bg-white/20" : "bg-white/10 text-neutral-300"}`}>{item.badge}</span> : null}</Link>;
  })}</nav>;
}
