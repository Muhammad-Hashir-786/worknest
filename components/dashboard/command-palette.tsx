"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Result = { id: string; title: string; subtitle: string; href: string; type: "Project" | "Task" | "Client" };

const quickActions = [
  { label: "Create a new project", hint: "Project", href: "/dashboard/projects/new", icon: "+" },
  { label: "Open reports", hint: "Analytics", href: "/dashboard/reports", icon: "▤" },
  { label: "Invite a teammate", hint: "Team", href: "/dashboard/settings/team", icon: "♧" },
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setOpen(true); } if (event.key === "Escape") setOpen(false); }
    window.addEventListener("keydown", onKeyDown); return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open || query.trim().length < 2) return;
    const controller = new AbortController(); const timer = window.setTimeout(async () => { setLoading(true); try { const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: controller.signal }); const data = await response.json() as { results?: Result[] }; setResults(data.results ?? []); } catch { if (!controller.signal.aborted) setResults([]); } finally { if (!controller.signal.aborted) setLoading(false); } }, 180);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [open, query]);

  function close() { setOpen(false); setQuery(""); }

  return <>
    <button type="button" onClick={() => setOpen(true)} className="fixed right-5 top-5 z-30 hidden items-center gap-2 rounded-xl border border-neutral-200 bg-white/90 px-3 py-2 text-xs font-semibold text-neutral-500 shadow-sm backdrop-blur transition hover:border-red-200 hover:text-[#b42318] lg:flex"><span className="text-sm">⌕</span><span>Search workspace</span><kbd className="rounded-md bg-neutral-100 px-1.5 py-0.5 font-mono text-[10px] text-neutral-400">⌘K</kbd></button>
    {open && <div className="fixed inset-0 z-[60] bg-neutral-950/35 p-4 backdrop-blur-[2px]" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}><section role="dialog" aria-modal="true" aria-label="Search workspace" className="mx-auto mt-[10vh] max-w-2xl overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-2xl shadow-neutral-950/20"><div className="flex items-center gap-3 border-b border-neutral-100 px-5"><span className="text-xl text-[#d92d27]">⌕</span><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search projects, tasks, clients…" className="min-w-0 flex-1 border-0 bg-transparent py-5 text-base text-neutral-900 outline-none focus:border-0 focus:ring-0" /><button type="button" onClick={close} className="rounded-lg bg-neutral-100 px-2 py-1 text-xs font-semibold text-neutral-500">Esc</button></div><div className="max-h-[55vh] overflow-y-auto p-3">{query.trim().length < 2 ? <div><p className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400">Quick actions</p>{quickActions.map((action) => <Link key={action.href} href={action.href} onClick={close} className="flex items-center gap-3 rounded-2xl px-3 py-3 transition hover:bg-red-50"><span className="grid h-9 w-9 place-items-center rounded-xl bg-red-50 text-sm font-bold text-[#d92d27]">{action.icon}</span><span className="flex-1"><span className="block text-sm font-semibold text-neutral-800">{action.label}</span><span className="block text-xs text-neutral-400">{action.hint}</span></span><span className="text-neutral-300">↗</span></Link>)}</div> : loading ? <p className="px-3 py-8 text-center text-sm text-neutral-500">Searching your workspace…</p> : results.length === 0 ? <p className="px-3 py-8 text-center text-sm text-neutral-500">No projects, tasks, or clients found.</p> : <div><p className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400">Results</p>{results.map((result) => <Link key={`${result.type}-${result.id}`} href={result.href} onClick={close} className="flex items-center gap-3 rounded-2xl px-3 py-3 transition hover:bg-red-50"><span className="grid h-9 w-9 place-items-center rounded-xl bg-neutral-100 text-[10px] font-bold uppercase text-neutral-500">{result.type.slice(0, 1)}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-neutral-800">{result.title}</span><span className="block truncate text-xs text-neutral-400">{result.subtitle}</span></span><span className="text-xs font-semibold text-neutral-300">{result.type}</span></Link>)}</div>}</div><footer className="flex items-center justify-between border-t border-neutral-100 bg-neutral-50 px-5 py-3 text-[11px] text-neutral-400"><span>Search across your current workspace</span><span>Press <kbd className="rounded bg-white px-1 font-mono">Esc</kbd> to close</span></footer></section></div>}
  </>;
}
