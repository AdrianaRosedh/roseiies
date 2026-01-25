// apps/studio/app/api/publish-garden-layout/route.ts
import { NextResponse } from "next/server";
import { createServerSupabase } from "@roseiies/supabase/server";
import { requireStudioToken } from "@/app/lib/server/tenant-auth";

type LayoutDoc = {
  version: 1;
  canvas: { width: number; height: number };
  items: Array<{
    id: string;
    type: string; // bed | tree | structure | zone | label | etc.
    x: number;
    y: number;
    w: number;
    h: number;
    r: number;
    order: number;
    label: string;
    meta: any;
    style: any;
  }>;
};

function canvasTag(id: string) {
  return `canvas:${id}`;
}

function extractCanvasIdFromTags(tags: unknown): string | null {
  if (!Array.isArray(tags)) return null;
  for (const t of tags) {
    const s = String(t ?? "");
    if (s.startsWith("canvas:")) return s.slice("canvas:".length);
  }
  return null;
}

function safeStr(v: any) {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}

function normalizeItemType(t: string) {
  const type = String(t ?? "").trim().toLowerCase();
  // keep it flexible; only normalize obvious cases
  if (type === "bed" || type === "tree" || type === "structure") return type;
  // if you have custom types, keep them
  return type || "bed";
}

function zonesFromMeta(meta: any): Array<{ code: string; name?: string | null; geom?: any | null }> {
  const z = meta?.zones;
  if (!Array.isArray(z)) return [];
  return z
    .map((it: any) => ({
      code: String(it?.code ?? "").trim(),
      name: safeStr(it?.name),
      geom: it?.geom ?? null,
    }))
    .filter((it) => it.code);
}

export async function POST(req: Request) {
  const supabase = createServerSupabase();

  const gate = requireStudioToken(req);
  if (!gate.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const gardenName = safeStr(body?.gardenName) ?? "Garden";
  const layoutName = safeStr(body?.layoutName) ?? "Garden Layout v1";
  const doc = body?.doc as LayoutDoc | null;

  // Optional override for later multi-workplace
  const workplaceSlug = safeStr(body?.workplaceSlug) ?? "olivea";

  if (!doc?.canvas || !Array.isArray(doc?.items)) {
    return NextResponse.json({ error: "Missing doc.canvas or doc.items" }, { status: 400 });
  }

  // 1) Resolve workplace
  const { data: workplace, error: werr } = await supabase
    .schema("roseiies")
    .from("workplaces")
    .select("id, slug, name")
    .eq("slug", workplaceSlug)
    .maybeSingle();

  if (werr || !workplace?.id) {
    return NextResponse.json({ error: werr?.message ?? "Workplace not found" }, { status: 404 });
  }

  // 2) Ensure Area exists (Garden / Vineyard / etc.)
  const { data: areaExisting, error: aerr } = await supabase
    .schema("roseiies")
    .from("areas")
    .select("id, name")
    .eq("workplace_id", workplace.id)
    .eq("name", gardenName)
    .maybeSingle();

  if (aerr) return NextResponse.json({ error: aerr.message }, { status: 500 });

  let areaId = areaExisting?.id as string | undefined;
  if (!areaId) {
    const { data: areaCreated, error: ains } = await supabase
      .schema("roseiies")
      .from("areas")
      .insert({
        workplace_id: workplace.id,
        name: gardenName,
        kind: "garden",
        notes: null,
      })
      .select("id")
      .single();

    if (ains || !areaCreated?.id) {
      return NextResponse.json({ error: ains?.message ?? "Failed to create area" }, { status: 500 });
    }
    areaId = areaCreated.id;
  }

  // 3) Find layout by name (within area/workplace)
  const { data: layoutExisting, error: lsel } = await supabase
    .schema("roseiies")
    .from("layouts")
    .select("id, version")
    .eq("workplace_id", workplace.id)
    .eq("area_id", areaId)
    .eq("name", layoutName)
    .maybeSingle();

  if (lsel) return NextResponse.json({ error: lsel.message }, { status: 500 });

  // 4) Deactivate other layouts in area (we want ONE active)
  const { error: deactErr } = await supabase
    .schema("roseiies")
    .from("layouts")
    .update({ is_active: false })
    .eq("workplace_id", workplace.id)
    .eq("area_id", areaId);

  if (deactErr) return NextResponse.json({ error: deactErr.message }, { status: 500 });

  // 5) Upsert layout row (activate + bump version)
  let layoutId: string;
  if (!layoutExisting?.id) {
    const { data: created, error: lins } = await supabase
      .schema("roseiies")
      .from("layouts")
      .insert({
        workplace_id: workplace.id,
        area_id: areaId,
        name: layoutName,
        version: 1,
        is_active: true,
        doc_json: {
          version: doc.version ?? 1,
          canvas: doc.canvas,
          // keep doc_json light; items are canonicalized into assets
          meta: { source: "studio.publish-garden-layout" },
        },
      })
      .select("id")
      .single();

    if (lins || !created?.id) {
      return NextResponse.json({ error: lins?.message ?? "Failed to create layout" }, { status: 500 });
    }
    layoutId = created.id;
  } else {
    layoutId = layoutExisting.id;
    const nextVersion = Number(layoutExisting.version ?? 1) + 1;

    const { error: lupd } = await supabase
      .schema("roseiies")
      .from("layouts")
      .update({
        is_active: true,
        version: nextVersion,
        doc_json: {
          version: doc.version ?? 1,
          canvas: doc.canvas,
          meta: { source: "studio.publish-garden-layout" },
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", layoutId);

    if (lupd) return NextResponse.json({ error: lupd.message }, { status: 500 });
  }

  // 6) Fetch existing assets for this area (includes stubs created from plantings)
  const { data: existingAssets, error: asel } = await supabase
    .schema("roseiies")
    .from("assets")
    .select("id, tags")
    .eq("workplace_id", workplace.id)
    .eq("area_id", areaId);

  if (asel) return NextResponse.json({ error: asel.message }, { status: 500 });

  const byCanvasId = new Map<string, { id: string; tags: any[] | null }>();
  for (const a of existingAssets ?? []) {
    const canvasId = extractCanvasIdFromTags((a as any)?.tags);
    if (canvasId) byCanvasId.set(canvasId, { id: (a as any).id, tags: (a as any).tags ?? null });
  }

  // 7) Upsert assets + zones for doc items
  let assetsInserted = 0;
  let assetsUpdated = 0;
  let zonesUpserted = 0;

  for (const it of doc.items ?? []) {
    const canvasId = String(it?.id ?? "").trim();
    if (!canvasId) continue;

    const tag = canvasTag(canvasId);
    const type = normalizeItemType(it.type);
    const name = safeStr(it.label);

    // Canonical geometry/style (keep flexible)
    const geom = {
      x: it.x,
      y: it.y,
      w: it.w,
      h: it.h,
      r: it.r,
      order: it.order ?? 0,
      canvas: doc.canvas,
      meta: it.meta ?? {},
    };

    const style = it.style ?? {};

    const existing = byCanvasId.get(canvasId);

    if (!existing) {
      const { data: created, error: ains } = await supabase
        .schema("roseiies")
        .from("assets")
        .insert({
          workplace_id: workplace.id,
          area_id: areaId,
          layout_id: layoutId,
          type,
          name,
          tags: [tag],
          geom,
          style,
        })
        .select("id")
        .single();

      if (ains || !created?.id) {
        return NextResponse.json({ error: ains?.message ?? `Failed to insert asset ${canvasId}` }, { status: 500 });
      }

      byCanvasId.set(canvasId, { id: created.id, tags: [tag] });
      assetsInserted++;
    } else {
      // keep tags (ensure canvas tag exists)
      const tags = Array.isArray(existing.tags) ? [...existing.tags] : [];
      if (!tags.includes(tag)) tags.push(tag);

      const { error: aupd } = await supabase
        .schema("roseiies")
        .from("assets")
        .update({
          layout_id: layoutId,
          type,
          name,
          tags,
          geom,
          style,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (aupd) {
        return NextResponse.json({ error: aupd.message ?? `Failed to update asset ${canvasId}` }, { status: 500 });
      }

      assetsUpdated++;
    }

    // Zones (only for beds typically, but keep generic)
    const assetId = byCanvasId.get(canvasId)!.id;
    const zones = zonesFromMeta(it.meta);

    for (const z of zones) {
      const { error: zerr } = await supabase
        .schema("roseiies")
        .from("zones")
        .upsert(
          {
            workplace_id: workplace.id,
            asset_id: assetId,
            code: z.code,
            name: z.name ?? null,
            geom: z.geom ?? null,
            updated_at: new Date().toISOString(),
          },
          // relies on unique(asset_id, code)
          { onConflict: "asset_id,code" }
        );

      if (zerr) return NextResponse.json({ error: zerr.message }, { status: 500 });
      zonesUpserted++;
    }
  }

  return NextResponse.json({
    ok: true,
    workplace: { id: workplace.id, slug: workplace.slug, name: workplace.name },
    area: { id: areaId, name: gardenName },
    layout: { id: layoutId, name: layoutName },
    assetsInserted,
    assetsUpdated,
    zonesUpserted,
  });
}
