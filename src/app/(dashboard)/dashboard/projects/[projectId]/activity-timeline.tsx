import type { ActivityFeedEntry } from "~/services/activity";

const eventStyles: Record<string, { icon: string; tone: string }> = {
  created: { icon: "+", tone: "bg-emerald-50 text-emerald-700" },
  updated: { icon: "↗", tone: "bg-blue-50 text-blue-700" },
  status_changed: { icon: "↻", tone: "bg-amber-50 text-amber-700" },
  commented: { icon: "…", tone: "bg-violet-50 text-violet-700" },
  assigned: { icon: "@", tone: "bg-red-50 text-[#b42318]" },
  deleted: { icon: "×", tone: "bg-neutral-100 text-neutral-600" },
};

function metadataText(item: ActivityFeedEntry): string {
  const metadata = item.metadata;
  if (metadata.event === "invoice_created") return `created an invoice${metadata.description ? ` for ${String(metadata.description)}` : ""}`;
  if (item.action === "status_changed" && metadata.status) return `changed a task to ${String(metadata.status).replaceAll("_", " ")}`;
  if (item.action === "commented") return "commented on a task";
  if (item.action === "assigned") return "assigned a task";
  return `${item.action.replaceAll("_", " ")} a ${item.entityType.toLowerCase()}`;
}

export default function ActivityTimeline({ entries }: { entries: ActivityFeedEntry[] }) {
  const groups = entries.reduce<Record<string, ActivityFeedEntry[]>>((result, entry) => {
    const label = new Date(entry.createdAt).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
    (result[label] ??= []).push(entry);
    return result;
  }, {});
  return <div className="worknest-panel rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#d92d27]">Project history</p><h2 className="mt-1 font-bold text-neutral-900">Activity timeline</h2></div>{entries.length === 0 ? <p className="mt-5 rounded-xl bg-neutral-50 p-5 text-sm text-neutral-500">Project activity will appear here as your team works.</p> : <div className="mt-6 space-y-7">{Object.entries(groups).map(([day, dayEntries]) => <section key={day}><h3 className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-neutral-400">{day}</h3><div className="space-y-4 border-l border-neutral-200 pl-5">{dayEntries.map((item) => { const style = eventStyles[item.action] ?? eventStyles.updated; return <div key={item.id} className="relative flex gap-3"><span className={`absolute -left-[2rem] grid h-7 w-7 place-items-center rounded-full text-xs font-bold ring-4 ring-white ${style.tone}`}>{style.icon}</span><div className="min-w-0 flex-1"><p className="text-sm text-neutral-700"><span className="font-bold text-neutral-900">{item.user.name}</span> {metadataText(item)}</p><p className="mt-1 text-xs text-neutral-400">{new Date(item.createdAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</p>{typeof item.metadata.excerpt === "string" && <p className="mt-2 rounded-xl bg-neutral-50 px-3 py-2 text-xs leading-5 text-neutral-500">“{item.metadata.excerpt}”</p>}</div></div>; })}</div></section>)}</div>}</div>;
}
