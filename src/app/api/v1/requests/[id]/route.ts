import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { userForBearer } from "@/lib/auth";
import { publicView } from "../route";

export const runtime = "nodejs";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const userId = userForBearer(req.headers.get("authorization"));
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const r = await getStore().get(id);
  if (!r || r.userId !== userId) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(publicView(r), { headers: { "Cache-Control": "no-store" } });
}
