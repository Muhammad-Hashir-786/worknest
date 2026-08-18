"use client";

import { FormEvent, Fragment, ReactNode, useEffect, useRef, useState } from "react";
import type { GuideAction } from "~/services/guide-actions";

type Message = { role: "user" | "assistant"; content: string; action?: GuideAction };
const starters = ["Give me a tour of WorkNest", "Where is the Kanban board?", "How do I invite my team?", "How do invoices work?"];
const followUps = ["Show my overdue tasks", "Summarize my active project", "How do I use WorkNest?"];
const welcome: Message = { role: "assistant", content: "Hi, I’m the WorkNest Guide. Ask me how to use projects, tasks, reports, invoices, or your workspace." };

function inlineMarkdown(value: string): ReactNode[] {
  const tokens = value.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g).filter(Boolean);
  return tokens.map((token, index) => {
    if (token.startsWith("**") && token.endsWith("**")) return <strong key={index} className="font-bold text-neutral-900">{token.slice(2, -2)}</strong>;
    if (token.startsWith("`") && token.endsWith("`")) return <code key={index} className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[11px] text-[#b42318]">{token.slice(1, -1)}</code>;
    const link = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link && /^(https?:\/\/|\/)/.test(link[2])) return <a key={index} href={link[2]} className="font-semibold text-[#b42318] underline decoration-red-200 underline-offset-2">{link[1]}</a>;
    return <Fragment key={index}>{token}</Fragment>;
  });
}

function GuideMessage({ content }: { content: string }) {
  const normalized = content.replace(/<br\s*\/?>(\s*)/gi, "\n").replace(/\s*\|\|\s*/g, "\n").replace(/\r/g, "");
  const lines = normalized.split("\n");
  const blocks: ReactNode[] = [];
  let paragraph: string[] = [];
  let list: { ordered: boolean; value: string }[] = [];
  const flushParagraph = () => { if (paragraph.length) { blocks.push(<p key={`p-${blocks.length}`}>{inlineMarkdown(paragraph.join(" "))}</p>); paragraph = []; } };
  const flushList = () => { if (list.length) { const ordered = list[0].ordered; const List = ordered ? "ol" : "ul"; blocks.push(<List key={`list-${blocks.length}`} className={`${ordered ? "list-decimal" : "list-disc"} space-y-1.5 pl-5`}>{list.map((item, index) => <li key={index}>{inlineMarkdown(item.value)}</li>)}</List>); list = []; } };
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) { flushParagraph(); flushList(); continue; }
    const heading = line.match(/^#{1,3}\s+(.+)$/);
    const bullet = line.match(/^[-*]\s+(.+)$/);
    const ordered = line.match(/^\d+[.)]\s+(.+)$/);
    if (heading) { flushParagraph(); flushList(); blocks.push(<h3 key={`h-${blocks.length}`} className="pt-1 font-bold text-neutral-950">{inlineMarkdown(heading[1])}</h3>); }
    else if (bullet || ordered) { flushParagraph(); const isOrdered = Boolean(ordered); if (list.length && list[0].ordered !== isOrdered) flushList(); list.push({ ordered: isOrdered, value: (bullet ?? ordered)![1] }); }
    else { flushList(); paragraph.push(line); }
  }
  flushParagraph(); flushList();
  return <div className="space-y-2.5">{blocks}</div>;
}

function ActionCard({ action }: { action: GuideAction }) {
  const [state, setState] = useState<"idle" | "pending" | "success" | "error" | "cancelled">("idle");
  const [undoAction, setUndoAction] = useState<GuideAction | undefined>();
  async function confirm() { setState("pending"); try { const response = await fetch("/api/guide/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(action) }); const data = await response.json().catch(() => ({})) as { undo?: GuideAction }; if (response.ok) { setUndoAction(data.undo); setState("success"); } else setState("error"); } catch { setState("error"); } }
  async function undo() { if (!undoAction) return; setState("pending"); try { const response = await fetch("/api/guide/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(undoAction) }); setState(response.ok ? "cancelled" : "error"); } catch { setState("error"); } }
  if (state === "success") return <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">✓ Done. <span className="font-normal">The change is now in your workspace.</span>{undoAction && <button type="button" onClick={() => void undo()} className="font-bold underline">Undo</button>}{action.payload && "projectId" in action.payload && <a href={`/dashboard/projects/${action.payload.projectId}`} className="underline">Open project</a>}</div>;
  if (state === "cancelled") return <p className="mt-3 text-xs text-neutral-400">Action cancelled.</p>;
  return <div className="mt-3 rounded-2xl border border-red-100 bg-red-50/70 p-3"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#b42318]">Confirmation needed</p><p className="mt-1 text-sm font-semibold text-neutral-800">{action.confirmation}</p>{state === "error" && <p className="mt-2 text-xs text-red-700">The action could not be completed. Check your permissions and try again.</p>}<div className="mt-3 flex gap-2"><button type="button" onClick={() => void confirm()} disabled={state === "pending"} className="rounded-xl bg-[#d92d27] px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{state === "pending" ? "Working…" : "Confirm"}</button><button type="button" onClick={() => setState("cancelled")} disabled={state === "pending"} className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-600">Cancel</button></div></div>;
}

export default function WorkNestGuide() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([welcome]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => { try { const saved = window.localStorage.getItem("worknest-guide-messages"); if (saved) { const parsed = JSON.parse(saved) as Message[]; if (Array.isArray(parsed) && parsed.length) setMessages(parsed.slice(-20)); } } catch { /* ignore malformed local state */ } }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => { messageEndRef.current?.scrollIntoView({ behavior: "smooth" }); try { window.localStorage.setItem("worknest-guide-messages", JSON.stringify(messages.slice(-20))); } catch { /* storage can be disabled */ } }, [messages, pending]);

  async function send(content = input) {
    const question = content.trim();
    if (!question || pending) return;
    const next = [...messages, { role: "user" as const, content: question }];
    setMessages(next); setInput(""); setPending(true);
    try {
      const response = await fetch("/api/guide", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: next.slice(-8) }) });
      const data = (await response.json().catch(() => ({}))) as { answer?: string; error?: string; action?: GuideAction };
      setMessages((current) => [...current, { role: "assistant", content: (response.ok ? data.answer : data.error) ?? "Something went wrong. Please try again.", action: response.ok ? data.action : undefined }]);
    } catch {
      setMessages((current) => [...current, { role: "assistant", content: "I couldn’t connect right now. Please try again." }]);
    } finally { setPending(false); window.setTimeout(() => inputRef.current?.focus(), 0); }
  }

  function submit(event: FormEvent) { event.preventDefault(); void send(); }

  return <div className="fixed bottom-5 right-5 z-50">
    <div className={`origin-bottom-right transition duration-200 ${open ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"}`} aria-hidden={!open}>
      <section id="worknest-guide" aria-label="WorkNest Guide" className="mb-3 flex h-[min(620px,calc(100vh-7rem))] w-[min(460px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl shadow-neutral-900/25">
        <header className="bg-[#171717] px-5 py-4 text-white"><div className="flex items-center justify-between"><div><div className="flex items-center gap-2"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" /><p className="text-xs font-bold uppercase tracking-[0.14em] text-red-300">Workspace copilot</p></div><h2 className="mt-0.5 font-bold">WorkNest Guide</h2><p className="mt-1 text-[11px] text-neutral-400">Connected to your workspace · confirms changes</p></div><div className="flex items-center gap-1"><button type="button" onClick={() => { setMessages([welcome]); window.localStorage.removeItem("worknest-guide-messages"); }} aria-label="Clear conversation" className="rounded-lg px-2 py-1 text-[11px] text-neutral-400 hover:bg-white/10 hover:text-white">Clear</button><button type="button" onClick={() => setOpen(false)} aria-label="Close guide" className="grid h-8 w-8 place-items-center rounded-lg text-xl text-neutral-300 hover:bg-white/10 hover:text-white">×</button></div></div></header>
        <div className="flex-1 space-y-3 overflow-y-auto bg-[#fafafa] p-4" aria-live="polite">{messages.map((message, index) => <div key={`${message.role}-${index}`} className={`max-w-[94%] rounded-2xl px-3.5 py-3 text-sm leading-6 ${message.role === "assistant" ? "rounded-tl-sm border border-neutral-100 bg-white text-neutral-700 shadow-sm" : "ml-auto rounded-tr-sm bg-[#d92d27] text-white shadow-sm"}`}>{message.role === "assistant" ? <><GuideMessage content={message.content} />{message.action && <ActionCard action={message.action} />}</> : message.content}</div>)}{pending && <div className="flex w-fit items-center gap-2 rounded-2xl rounded-tl-sm border border-neutral-100 bg-white px-3.5 py-2.5 text-sm text-neutral-400 shadow-sm" role="status"><span className="flex gap-1"><i className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#d92d27]" /><i className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#d92d27] [animation-delay:120ms]" /><i className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#d92d27] [animation-delay:240ms]" /></span>Thinking…</div>}<div ref={messageEndRef} /></div>
        <div className="border-t border-neutral-100 p-3">{messages.length === 1 ? <div className="mb-2 flex flex-wrap gap-1.5">{starters.map((starter) => <button type="button" key={starter} disabled={pending} onClick={() => void send(starter)} className="rounded-full border border-red-100 bg-red-50 px-2.5 py-1 text-xs font-semibold text-[#d92d27] hover:bg-red-100 disabled:opacity-50">{starter}</button>)}</div> : <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1">{followUps.map((starter) => <button type="button" key={starter} disabled={pending} onClick={() => void send(starter)} className="shrink-0 rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-xs font-semibold text-neutral-600 hover:border-red-200 hover:text-[#d92d27] disabled:opacity-50">{starter}</button>)}</div>}<form onSubmit={submit} className="flex gap-2"><input ref={inputRef} value={input} onChange={(event) => setInput(event.target.value)} maxLength={1200} placeholder="Ask anything about your work…" aria-label="Ask the WorkNest Guide" className="min-w-0 flex-1 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm" /><button type="submit" disabled={pending || !input.trim()} className="rounded-xl bg-[#d92d27] px-3 py-2 text-sm font-bold text-white disabled:opacity-40">Send</button></form></div>
      </section>
    </div>
    <button type="button" onClick={() => { setOpen((value) => !value); window.setTimeout(() => inputRef.current?.focus(), 200); }} aria-expanded={open} aria-controls="worknest-guide" aria-label="Open WorkNest Guide" className="flex h-14 items-center gap-2 rounded-full bg-[#d92d27] px-5 text-sm font-bold text-white shadow-xl shadow-red-950/30 transition hover:-translate-y-0.5 hover:bg-[#b42318]"><span className="grid h-7 w-7 place-items-center rounded-full bg-white/15 text-base">✦</span>{open ? "Close guide" : "Ask WorkNest"}</button>
  </div>;
}
