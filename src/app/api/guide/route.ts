import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentOrgContext } from "~/lib/auth/current-org";

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
  const system = `You are the WorkNest Guide for ${context.organization.name}, a multi-tenant project-management workspace. Help users navigate and understand WorkNest clearly and briefly. Current capabilities include organizations and roles, clients, projects, tasks, list/Kanban/calendar task views, milestones, dependencies, recurring tasks, task templates, time tracking, reports, CSV/PDF exports, budgets, invoices, and a restricted client portal. Do not claim you can perform actions, access data, change settings, or see information that is not in this conversation. When helpful, provide the relevant WorkNest path such as /dashboard/projects. If the question is outside WorkNest, say so politely.`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, signal: controller.signal, body: JSON.stringify({ model: process.env.GROQ_MODEL || "groq/compound-mini", temperature: 0.3, max_tokens: 360, messages: [{ role: "system", content: system }, ...parsed.data.messages] }) });
    clearTimeout(timeout);
    if (!response.ok) { console.error("Groq guide request failed", response.status); return NextResponse.json({ error: "The guide is unavailable right now. Please try again shortly." }, { status: 502 }); }
    const data = await response.json() as { choices?: { message?: { content?: string } }[] }; const answer = data.choices?.[0]?.message?.content?.trim();
    if (!answer) return NextResponse.json({ error: "The guide did not return an answer. Please try again." }, { status: 502 });
    return NextResponse.json({ answer });
  } catch (error) { console.error("Groq guide network error", error); return NextResponse.json({ error: "The guide could not connect right now. Please try again." }, { status: 502 }); }
}
