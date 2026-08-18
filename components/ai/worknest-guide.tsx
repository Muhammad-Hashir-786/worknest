"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

type Message = { role: "user" | "assistant"; content: string };
const starters = ["Where is the Kanban board?", "How do I invite my team?", "How do invoices work?"];
const welcome: Message = { role: "assistant", content: "Hi, I’m the WorkNest Guide. Ask me how to use projects, tasks, reports, invoices, or your workspace." };

export default function WorkNestGuide() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([welcome]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { messageEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, pending]);

  async function send(content = input) {
    const question = content.trim();
    if (!question || pending) return;
    const next = [...messages, { role: "user" as const, content: question }];
    setMessages(next); setInput(""); setPending(true);
    try {
      const response = await fetch("/api/guide", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: next.slice(-8) }) });
      const data = (await response.json().catch(() => ({}))) as { answer?: string; error?: string };
      setMessages((current) => [...current, { role: "assistant", content: (response.ok ? data.answer : data.error) ?? "Something went wrong. Please try again." }]);
    } catch {
      setMessages((current) => [...current, { role: "assistant", content: "I couldn’t connect right now. Please try again." }]);
    } finally { setPending(false); window.setTimeout(() => inputRef.current?.focus(), 0); }
  }

  function submit(event: FormEvent) { event.preventDefault(); void send(); }

  return <div className="fixed bottom-5 right-5 z-50">
    <div className={`origin-bottom-right transition duration-200 ${open ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"}`} aria-hidden={!open}>
      <section id="worknest-guide" aria-label="WorkNest Guide" className="mb-3 flex h-[460px] w-[min(380px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl shadow-neutral-900/25">
        <header className="bg-[#171717] px-5 py-4 text-white"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-red-300">AI assistant</p><h2 className="mt-0.5 font-bold">WorkNest Guide</h2></div><button type="button" onClick={() => setOpen(false)} aria-label="Close guide" className="grid h-8 w-8 place-items-center rounded-lg text-xl text-neutral-300 hover:bg-white/10 hover:text-white">×</button></div></header>
        <div className="flex-1 space-y-3 overflow-y-auto bg-[#fafafa] p-4" aria-live="polite">{messages.map((message, index) => <div key={`${message.role}-${index}`} className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-6 ${message.role === "assistant" ? "rounded-tl-sm bg-white text-neutral-700 shadow-sm" : "ml-auto rounded-tr-sm bg-[#d92d27] text-white"}`}>{message.content}</div>)}{pending && <div className="w-fit rounded-2xl rounded-tl-sm bg-white px-3.5 py-2.5 text-sm text-neutral-400 shadow-sm" role="status">Thinking…</div>}<div ref={messageEndRef} /></div>
        <div className="border-t border-neutral-100 p-3">{messages.length === 1 && <div className="mb-2 flex flex-wrap gap-1.5">{starters.map((starter) => <button type="button" key={starter} disabled={pending} onClick={() => void send(starter)} className="rounded-full border border-red-100 bg-red-50 px-2.5 py-1 text-xs font-semibold text-[#d92d27] hover:bg-red-100 disabled:opacity-50">{starter}</button>)}</div>}<form onSubmit={submit} className="flex gap-2"><input ref={inputRef} value={input} onChange={(event) => setInput(event.target.value)} maxLength={1200} placeholder="Ask about WorkNest…" aria-label="Ask the WorkNest Guide" className="min-w-0 flex-1 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm" /><button type="submit" disabled={pending || !input.trim()} className="rounded-xl bg-[#d92d27] px-3 py-2 text-sm font-bold text-white disabled:opacity-40">Send</button></form></div>
      </section>
    </div>
    <button type="button" onClick={() => { setOpen((value) => !value); window.setTimeout(() => inputRef.current?.focus(), 200); }} aria-expanded={open} aria-controls="worknest-guide" aria-label="Open WorkNest Guide" className="flex h-14 items-center gap-2 rounded-full bg-[#d92d27] px-5 text-sm font-bold text-white shadow-xl shadow-red-950/30 transition hover:-translate-y-0.5 hover:bg-[#b42318]"><span className="grid h-7 w-7 place-items-center rounded-full bg-white/15 text-base">✦</span>{open ? "Close guide" : "Ask WorkNest"}</button>
  </div>;
}
