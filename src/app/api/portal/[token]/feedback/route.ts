import { NextResponse } from "next/server";
import { z } from "zod";
import { createPortalFeedback } from "~/services/portal-feedback";

const schema = z.object({ type: z.enum(["message", "approval"]), message: z.string().trim().min(1).max(1200) });
const attempts = new Map<string, { at: number; count: number }>();

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const now = Date.now(); const current = attempts.get(token);
  if (!current || now - current.at > 60_000) attempts.set(token, { at: now, count: 1 });
  else if (current.count >= 8) return NextResponse.json({ error: "Please wait a minute before sending more feedback." }, { status: 429 });
  else current.count += 1;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a short message." }, { status: 400 });
  const result = await createPortalFeedback(token, parsed.data.type, parsed.data.message);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ success: true });
}
