// apps/studio/app/api/publish-garden-layout/route.ts
import { NextResponse } from "next/server";
import { createServerSupabase } from "@roseiies/supabase/server";
import { requireStudioToken } from "@/app/lib/server/tenant-auth";

type LayoutDoc = {
  version: 1;
  canvas: { width: number; height: number };
  items: Array<{
    id: string;
    type: string;
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
  if (type === "bed" || type === "tree" || type === "structure") return type;
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

  let step = "start";

  try {
    step = "parse_body";
    const body: any = await req.json();

    // ✅ physical DB area
    const areaName = safeStr(body?.areaName) ?? "Garden";

    // ✅ version label
    const layoutName = safeStr(body?.layoutName) ?? "Garden Layout v1";

    // ✅ canonical document
    const doc = body?.doc as LayoutDoc | null;

    // Optional workplace override
    const workplaceSlug = safeStr(body?.workplaceSlug) ?? "olivea";

    if (!doc?.canvas || !Array.isArray(doc?.items)) {
      return NextResponse.json({ error: "Missing doc.canvas or doc.items" }, { status: 400 });
    }

    step = "resolve_workplace";
    const { data: workplace, error: werr } = await supabase
      .schema("roseiies")
      .from("workplaces")
      .select("id, slug, name")
      .eq("slug", workplaceSlug)
      .maybeSingle();

    if (werr || !workplace?.id) {
      return NextResponse.json({ error: werr?.message ?? "Workplace not found" }, { status: 404 });
    }

    step = "ensure_area";
    const { data: areaExisting, error: aerr } = await supabase
      .schema("roseiies")
      .from("areas")
      .select("id, name, viewer_enabled")
      .eq("workplace_id", workplace.id)
      .eq("name", areaName)
      .maybeSingle();

    if (aerr) return NextResponse.json({ error: aerr.message, step }, { status: 500 });

    let areaId = areaExisting?.id as string | undefined;
    const viewerWasEnabled = Boolean((areaExisting as any)?.viewer_enabled);

    if (!areaId) {
      const { data: createdArea, error: ains } = await supabase
        .schema("roseiies")
        .from("areas")
        .insert({
          workplace_id: workplace.id,
          name: areaName,
          kind: "garden",
          notes: null,
        })
        .select("id")
        .single();

      if (ains || !createdArea?.id) {
        return NextResponse.json(
          { error: ains?.message ?? "Failed to create area", step },
          { status: 500 }
        );
      }
      areaId = createdArea.id;
    }

    // ✅ Gate: tenant viewer exists only after first publish
    // (idempotent: only flips false -> true)
    step = "enable_viewer_gate";
    const { error: vupd } = await supabase
      .schema("roseiies")
      .from("areas")
      .update({
        viewer_enabled: true,
        viewer_follow_active: true,
        viewer_layout_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", areaId!)
      .eq("viewer_enabled", false);

    if (vupd) return NextResponse.json({ error: vupd.message, step }, { status: 500 });

    step = "find_layout";
    const { data: layoutExisting, error: lsel } = await supabase
      .schema("roseiies")
      .from("layouts")
      .select("id, version")
      .eq("workplace_id", workplace.id)
      .eq("area_id", areaId!)
      .eq("name", layoutName)
      .maybeSingle();

    if (lsel) return NextResponse.json({ error: lsel.message, step }, { status: 500 });

    step = "deactivate_layouts";
    const { error: deactErr } = await supabase
      .schema("roseiies")
      .from("layouts")
      .update({ is_active: false })
      .eq("workplace_id", workplace.id)
      .eq("area_id", areaId!);

    if (deactErr) return NextResponse.json({ error: deactErr.message, step }, { status: 500 });

    step = "upsert_layout";
    let layoutId: string;

    if (!layoutExisting?.id) {
      const { data: created, error: lins } = await supabase
        .schema("roseiies")
        .from("layouts")
        .insert({
          workplace_id: workplace.id,
          area_id: areaId!,
          name: layoutName,
          version: 1,
          is_active: true,
          doc_json: {
            version: doc.version ?? 1,
            canvas: doc.canvas,
            meta: { source: "studio.publish-garden-layout" },
          },
        })
        .select("id")
        .single();

      if (lins || !created?.id) {
        return NextResponse.json({ error: lins?.message ?? "Failed to create layout", step }, { status: 500 });
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

      if (lupd) return NextResponse.json({ error: lupd.message, step }, { status: 500 });
    }

    step = "load_existing_assets";
    const { data: existingAssets, error: asel } = await supabase
      .schema("roseiies")
      .from("assets")
      .select("id, tags")
      .eq("workplace_id", workplace.id)
      .eq("area_id", areaId!);

    if (asel) return NextResponse.json({ error: asel.message, step }, { status: 500 });

    const byCanvasId = new Map<string, { id: string; tags: any[] | null }>();
    for (const a of existingAssets ?? []) {
      const canvasId = extractCanvasIdFromTags((a as any)?.tags);
      if (canvasId) byCanvasId.set(canvasId, { id: (a as any).id, tags: (a as any).tags ?? null });
    }

    step = "upsert_assets_and_zones";
    let assetsInserted = 0;
    let assetsUpdated = 0;
    let zonesUpserted = 0;

    for (const it of doc.items ?? []) {
      const canvasId = String(it?.id ?? "").trim();
      if (!canvasId) continue;

      const tag = canvasTag(canvasId);
      const type = normalizeItemType(it.type);
      const name = safeStr(it.label);

      // ✅ canonical geometry must overwrite stubs
      const geom = {
        x: it.x,
        y: it.y,
        w: it.w,
        h: it.h,
        r: it.r ?? 0,
        order: it.order ?? 0,
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
            area_id: areaId!,
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
          return NextResponse.json(
            { error: ains?.message ?? `Failed to insert asset ${canvasId}`, step },
            { status: 500 }
          );
        }

        byCanvasId.set(canvasId, { id: created.id, tags: [tag] });
        assetsInserted++;
      } else {
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
          return NextResponse.json(
            { error: aupd.message ?? `Failed to update asset ${canvasId}`, step },
            { status: 500 }
          );
        }

        assetsUpdated++;
      }

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
            { onConflict: "asset_id,code" }
          );

        if (zerr) return NextResponse.json({ error: zerr.message, step }, { status: 500 });
        zonesUpserted++;
      }
    }

    const itemsWritten = assetsInserted + assetsUpdated;

    step = "done";
    return NextResponse.json({
      ok: true,
      workplace: { id: workplace.id, slug: workplace.slug, name: workplace.name },
      area: { id: areaId, name: areaName },
      layout: { id: layoutId, name: layoutName },
      assetsInserted,
      assetsUpdated,
      zonesUpserted,
      itemsWritten,
    });
  } catch (e: any) {
    console.error("publish-garden-layout crashed", { step, error: e });
    return NextResponse.json({ error: e?.message ?? "publish-garden-layout crashed", step }, { status: 500 });
  }
}
