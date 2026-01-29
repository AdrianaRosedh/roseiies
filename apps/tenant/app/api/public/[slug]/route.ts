import { NextResponse } from "next/server";
import { resolvePublicSlug } from "@/lib/public/resolve-public-slug";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  const { slug } = await ctx.params;
  const s = String(slug ?? "").trim();
  if (!s) return NextResponse.json({ ok: false, error: "missing slug" }, { status: 400 });

  const res = await resolvePublicSlug({ slug: s });
  if (!res) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });

  return NextResponse.json({ ok: true, slug: s, ...res });
}
