import { NextResponse } from "next/server";
import { loadViewById } from "@/lib/views/load-view";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ viewId: string }> }
) {
  const { viewId } = await ctx.params;
  const id = String(viewId ?? "").trim();
  if (!id) return NextResponse.json({ ok: false, error: "missing viewId" }, { status: 400 });

  const view = await loadViewById({ viewId: id });
  if (!view) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });

  return NextResponse.json({ ok: true, view });
}
