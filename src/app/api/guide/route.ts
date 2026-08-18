import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentOrgContext } from "~/lib/auth/current-org";
import { getGuideWorkspaceContext } from "~/services/guide-context";
import { detectGuideAction } from "~/services/guide-actions";

const requestSchema = z.object({ messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(1200) })).min(1).max(8) });
const windows = new Map<string, { startedAt: number; count: number }>();
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 12;
function allowed(userId: string) {
  const now = Date.now();
  const current = windows.get(userId);
  if (!current || now - current.startedAt > WINDOW_MS) {
    windows.set(userId, { startedAt: now, count: 1 });
    return true;
  }
  if (current.count >= MAX_REQUESTS_PER_WINDOW) return false;
  current.count += 1;
  return true;
}

export const runtime = "nodejs";

export async function POST(request: Request) {
  const context = await getCurrentOrgContext();
  if (!context?.organization) return NextResponse.json({ error: "Sign in to use the WorkNest Guide." }, { status: 401 });
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Please enter a short question." }, { status: 400 });
  if (!allowed(context.user.id)) return NextResponse.json({ error: "The guide is taking a short break. Please try again in a minute." }, { status: 429 });
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "The guide is ready, but GROQ_API_KEY has not been configured yet." }, { status: 503 });
  const latestUserMessage = [...parsed.data.messages].reverse().find((message) => message.role === "user")?.content ?? "";
  const workspaceContext = await getGuideWorkspaceContext(context.organization.id, latestUserMessage, context.user.id);
  const action = await detectGuideAction(context.organization.id, latestUserMessage);
  const system = `You are the WorkNest Guide for ${context.organization.name}. Be a warm, capable human copilot: explain the product as if you are sitting beside the user, then help them finish the work. You can read the verified private workspace context below, but never invent or expose data from another organization. Prefer direct answers over generic advice. For overdue or deadline questions, name the task, date, project, and link. For project summaries, give a one-sentence health read, progress/status evidence, then blockers and the next best step. If no evidence exists, say that plainly. If the user asks to change data, tell them exactly what will happen and say a confirmation button is ready; never claim it happened until the button is confirmed. You understand projects, clients, tasks, list/Kanban/calendar views, milestones, dependencies, recurring tasks, templates, time tracking, reports, invoices, budgets, notifications, and the client portal. Use clean Markdown with a short bold takeaway, compact bullets, and links from context. Never output HTML, <br>, ||, pipe tables, or long walls of text. Keep under 220 words.\n\nVERIFIED WORKSPACE CONTEXT:\n${workspaceContext}`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, signal: controller.signal, body: JSON.stringify({ model: process.env.GROQ_MODEL || "groq/compound-mini", temperature: 0.3, max_tokens: 360, messages: [{ role: "system", content: system }, ...parsed.data.messages] }) });
    clearTimeout(timeout);
    if (!response.ok) { console.error("Groq guide request failed", response.status); return NextResponse.json({ error: "The guide is unavailable right now. Please try again shortly." }, { status: 502 }); }
    const data = await response.json() as { choices?: { message?: { content?: string } }[] }; const answer = data.choices?.[0]?.message?.content?.trim();
    if (!answer) return NextResponse.json({ error: "The guide did not return an answer. Please try again." }, { status: 502 });
    return NextResponse.json({ answer, action });
  } catch (error) { console.error("Groq guide network error", error); return NextResponse.json({ error: "The guide could not connect right now. Please try again." }, { status: 502 }); }
}
