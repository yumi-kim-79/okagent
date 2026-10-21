import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getStore } from "@/lib/store";
import { notifyDecided } from "@/lib/notify";

export const runtime = "nodejs";

/** Called by the approval page. Authenticated by the one-time token from the approve link (no account needed on the phone). */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let body: { token: string; decision: "approved" | "rejected"; note?: string };
  try { body = z.object({ token: z.string().min(10), decision: z.enum(["approved", "rejected"]), note: z.string().max(500).optional() }).parse(await req.json()); }
  catch { return NextResponse.json({ error: "invalid body" }, { status: 400 }); }
  const store = getStore();
  const r = await store.get(id);
  if (!r || r.token !== body.token) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (r.status !== "pending") return NextResponse.json({ error: `already ${r.status}`, status: r.status }, { status: 409 });
  const decided = await store.decide(id, body.decision, body.note ?? null);
  if (decided) await notifyDecided(decided);
  return NextResponse.json({ id, status: decided?.status, decidedAt: decided?.decidedAt });
}
