import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getStore } from "@/lib/store";
import { userForBearer } from "@/lib/auth";
import { approveUrl, notifyPending } from "@/lib/notify";

export const runtime = "nodejs";

const Body = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  action: z.string().min(1).max(120),
  payload: z.unknown().optional(),
  amount: z.number().finite().optional(),
  currency: z.string().max(8).optional(),
  source: z.string().max(80).optional(),
  expiresIn: z.number().int().min(30).max(7 * 86400).default(600),
  callbackUrl: z.string().url().optional(),
});

export function publicView(r: Awaited<ReturnType<ReturnType<typeof getStore>["get"]>>) {
  if (!r) return null;
  return { id: r.id, status: r.status, title: r.title, action: r.action, amount: r.amount, currency: r.currency, source: r.source, createdAt: r.createdAt, expiresAt: r.expiresAt, decidedAt: r.decidedAt, note: r.note, approveUrl: r.status === "pending" ? approveUrl(r) : undefined };
}

export async function POST(req: NextRequest) {
  const userId = userForBearer(req.headers.get("authorization"));
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  let body: z.infer<typeof Body>;
  try { body = Body.parse(await req.json()); } catch (e) { return NextResponse.json({ error: "invalid body", detail: e instanceof Error ? e.message : String(e) }, { status: 400 }); }

  const r = await getStore().create({
    userId, title: body.title, description: body.description ?? null, action: body.action, payload: body.payload ?? null,
    amount: body.amount ?? null, currency: body.currency ?? (body.amount != null ? "KRW" : null), source: body.source ?? null,
    status: "pending", note: null, expiresAt: new Date(Date.now() + body.expiresIn * 1000).toISOString(), decidedAt: null, callbackUrl: body.callbackUrl ?? null,
  });
  await notifyPending(r);
  return NextResponse.json(publicView(r), { status: 201 });
}

export async function GET(req: NextRequest) {
  const userId = userForBearer(req.headers.get("authorization"));
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const list = await getStore().listPending(userId);
  return NextResponse.json({ pending: list.map(publicView) });
}
