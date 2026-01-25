// apps/studio/app/api/plantings/route.ts
import { createServerSupabase } from "@roseiies/supabase/server";
import { requireStudioToken } from "../../lib/server/tenant-auth";

/**
 * Roseiies Garden v1 (bridge):
 * - Reads/Writes from schema: roseiies.*
 * - Workspace boundary is "workplace_id"
 * - The UI still thinks in bed_id + zone_code + crop
 *   We bridge:
 *     crop -> items (name/slug) -> item_id
 *     bed_id -> assets.tags contains "canvas:<bed_id>" -> asset_id
 *     zone_code -> zones.code (per asset) -> zone_id
 */

type Context = {
  workplaceId: string;
  areaId: string;
  layoutId: string;
  workplaceSlug: string;
  areaName: string;
};

function slugify(s: string) {
  return String(s)
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function canvasTag(bedId: string) {
  return `canvas:${bedId}`;
}

function extractCanvasIdFromTags(tags: unknown): string | null {
  if (!Array.isArray(tags)) return null;
  for (const t of tags) {
    const s = String(t ?? "");
    if (s.startsWith("canvas:")) return s.slice("canvas:".length);
  }
  return null;
}

function firstOrNull<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

function tagsFromJoin(v: any): any[] | null {
  const row = firstOrNull(v);
  const tags = (row as any)?.tags;
  return Array.isArray(tags) ? tags : null;
}

function codeFromJoin(v: any): string | null {
  const row = firstOrNull(v);
  const code = (row as any)?.code;
  return code == null ? null : String(code);
}

function nameFromJoin(v: any): string | null {
  const row = firstOrNull(v);
  const name = (row as any)?.name;
  return name == null ? null : String(name);
}

async function resolveContext(args: {
  supabase: any;
  workplaceSlug: string;
  areaName: string;
  layoutId?: string | null;
}): Promise<{ ctx: Context | null; error: string | null }> {
  const { supabase, workplaceSlug, areaName, layoutId } = args;

  // If layoutId is provided, resolve workplace+area from it (strongest anchor)
  if (layoutId) {
    const { data: layout, error: lerr } = await supabase
      .schema("roseiies")
      .from("layouts")
      .select("id, workplace_id, area_id")
      .eq("id", layoutId)
      .maybeSingle();

    if (lerr || !layout?.id) {
      return { ctx: null, error: lerr?.message ?? "Layout not found" };
    }

    const { data: workplace } = await supabase
      .schema("roseiies")
      .from("workplaces")
      .select("id, slug")
      .eq("id", layout.workplace_id)
      .maybeSingle();

    const { data: area } = await supabase
      .schema("roseiies")
      .from("areas")
      .select("id, name")
      .eq("id", layout.area_id)
      .maybeSingle();

    if (!workplace?.id || !area?.id) return { ctx: null, error: "Invalid layout context" };

    return {
      ctx: {
        workplaceId: workplace.id,
        areaId: area.id,
        layoutId: layout.id,
        workplaceSlug: workplace.slug,
        areaName: area.name,
      },
      error: null,
    };
  }

  // Else resolve by (workplaceSlug, areaName, active layout)
  const { data: workplace, error: werr } = await supabase
    .schema("roseiies")
    .from("workplaces")
    .select("id, slug")
    .eq("slug", workplaceSlug)
    .maybeSingle();

  if (werr || !workplace?.id) return { ctx: null, error: werr?.message ?? "Workplace not found" };

  const { data: area, error: aerr } = await supabase
    .schema("roseiies")
    .from("areas")
    .select("id, name")
    .eq("workplace_id", workplace.id)
    .eq("name", areaName)
    .maybeSingle();

  if (aerr || !area?.id) return { ctx: null, error: aerr?.message ?? "Area not found" };

  const { data: layout, error: lerr } = await supabase
    .schema("roseiies")
    .from("layouts")
    .select("id")
    .eq("workplace_id", workplace.id)
    .eq("area_id", area.id)
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lerr || !layout?.id) return { ctx: null, error: lerr?.message ?? "Active layout not found" };

  return {
    ctx: {
      workplaceId: workplace.id,
      areaId: area.id,
      layoutId: layout.id,
      workplaceSlug: workplace.slug,
      areaName: area.name,
    },
    error: null,
  };
}

async function ensureItemId(args: { supabase: any; workplaceId: string; crop: string }) {
  const { supabase, workplaceId, crop } = args;
  const slug = slugify(crop);
  // Try existing
  const { data: existing } = await supabase
    .schema("roseiies")
    .from("items")
    .select("id")
    .eq("workplace_id", workplaceId)
    .eq("slug", slug)
    .maybeSingle();

  if (existing?.id) return existing.id as string;

  // Create
  const { data: created, error } = await supabase
    .schema("roseiies")
    .from("items")
    .insert({
      workplace_id: workplaceId,
      name: crop.trim(),
      slug,
      category: null,
      notes: null,
    })
    .select("id")
    .single();

  if (error || !created?.id) throw new Error(error?.message ?? "Failed to create item");
  return created.id as string;
}

async function ensureAssetId(args: {
  supabase: any;
  workplaceId: string;
  areaId: string;
  layoutId: string;
  bedId: string;
}) {
  const { supabase, workplaceId, areaId, layoutId, bedId } = args;
  const tag = canvasTag(bedId);

  const { data: existing } = await supabase
    .schema("roseiies")
    .from("assets")
    .select("id, tags")
    .eq("workplace_id", workplaceId)
    .contains("tags", [tag])
    .limit(1)
    .maybeSingle();

  if (existing?.id) return existing.id as string;

  // Bridge behavior: create stub asset if layout hasn’t been published yet.
  const { data: created, error } = await supabase
    .schema("roseiies")
    .from("assets")
    .insert({
      workplace_id: workplaceId,
      area_id: areaId,
      layout_id: layoutId,
      type: "bed",
      name: null,
      tags: [tag],
      geom: {},
      style: null,
    })
    .select("id")
    .single();

  if (error || !created?.id) throw new Error(error?.message ?? "Failed to create asset");
  return created.id as string;
}

async function ensureZoneId(args: { supabase: any; workplaceId: string; assetId: string; zoneCode: string }) {
  const { supabase, workplaceId, assetId, zoneCode } = args;

  const code = String(zoneCode).trim();
  if (!code) return null;

  const { data: existing } = await supabase
    .schema("roseiies")
    .from("zones")
    .select("id")
    .eq("asset_id", assetId)
    .eq("code", code)
    .maybeSingle();

  if (existing?.id) return existing.id as string;

  const { data: created, error } = await supabase
    .schema("roseiies")
    .from("zones")
    .insert({
      workplace_id: workplaceId,
      asset_id: assetId,
      code,
      name: null,
      geom: null,
    })
    .select("id")
    .single();

  if (error || !created?.id) throw new Error(error?.message ?? "Failed to create zone");
  return created.id as string;
}

export async function GET(req: Request) {
  const supabase = createServerSupabase();
  const url = new URL(req.url);

  // Backwards compatible:
  // - gardenName (old) => areaName (new)
  const areaName = (url.searchParams.get("areaName") ?? url.searchParams.get("gardenName") ?? "Garden").trim();
  const workplaceSlug = (url.searchParams.get("workplaceSlug") ?? "olivea").trim();
  const layoutId = url.searchParams.get("layoutId");

  const { ctx, error: cerr } = await resolveContext({ supabase, workplaceSlug, areaName, layoutId });
  if (!ctx) return Response.json({ error: cerr ?? "Missing context" }, { status: 404 });

  // Pull plantings + join for UI bridge fields (crop, bed_id, zone_code)
  const { data, error } = await supabase
    .schema("roseiies")
    .from("plantings")
    .select(
      `
      id,
      planted_at,
      status,
      pin_x,
      pin_y,
      created_at,
      updated_at,
      item:items!plantings_item_id_fkey(name),
      asset:assets!plantings_asset_id_fkey(tags),
      zone:zones!plantings_zone_id_fkey(code)
    `
    )
    .eq("workplace_id", ctx.workplaceId)
    .eq("area_id", ctx.areaId)
    .order("created_at", { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 400 });

  const rows = (data ?? []).map((r: any) => {
    const bed_id = extractCanvasIdFromTags(tagsFromJoin(r?.asset)) ?? null;
    return {
      id: String(r.id),
      bed_id,
      zone_code: codeFromJoin(r?.zone),
      crop: nameFromJoin(r?.item),
      status: r?.status ?? null,
      planted_at: r?.planted_at ?? null,
      pin_x: r?.pin_x ?? null,
      pin_y: r?.pin_y ?? null,
      created_at: r?.created_at ?? null,
    };
  });

  return Response.json({ context: ctx, rows });
}

export async function POST(req: Request) {
  const supabase = createServerSupabase();

  const gate = requireStudioToken(req);
  if (!gate.ok) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const workplaceSlug = String(body?.workplaceSlug ?? "olivea").trim();
  const areaName = String(body?.areaName ?? body?.gardenName ?? "Garden").trim();
  const layoutId = (body?.layoutId as string | null | undefined) ?? null;

  const crop = (body?.crop as string | null | undefined)?.trim();
  if (!crop) return Response.json({ error: "Crop is required" }, { status: 400 });

  const bed_id = (body?.bed_id as string | null | undefined)?.trim();
  if (!bed_id) return Response.json({ error: "Bed/Tree is required" }, { status: 400 });

  const { ctx, error: cerr } = await resolveContext({ supabase, workplaceSlug, areaName, layoutId });
  if (!ctx) return Response.json({ error: cerr ?? "Missing context" }, { status: 400 });

  const itemId = await ensureItemId({ supabase, workplaceId: ctx.workplaceId, crop });
  const assetId = await ensureAssetId({
    supabase,
    workplaceId: ctx.workplaceId,
    areaId: ctx.areaId,
    layoutId: ctx.layoutId,
    bedId: bed_id,
  });

  const zone_code = (body?.zone_code as string | null | undefined)?.trim() ?? null;
  const zoneId = zone_code ? await ensureZoneId({ supabase, workplaceId: ctx.workplaceId, assetId, zoneCode: zone_code }) : null;

  const planted_at = body?.planted_at ?? null;
  const pin_x = body?.pin_x ?? null;
  const pin_y = body?.pin_y ?? null;

  // Accept loose status from UI, but keep safe
  const statusRaw = (body?.status as string | null | undefined)?.trim() ?? null;
  const status = statusRaw && ["planned", "active", "harvested", "failed", "archived"].includes(statusRaw) ? statusRaw : "active";

  const { data: created, error } = await supabase
    .schema("roseiies")
    .from("plantings")
    .insert({
      workplace_id: ctx.workplaceId,
      item_id: itemId,
      seed_lot_id: null,
      area_id: ctx.areaId,
      asset_id: assetId,
      zone_id: zoneId,
      pin_x,
      pin_y,
      planted_at,
      status,
      failed_reason: null,
      notes_garden: null,
      notes_kitchen: null,
      notes_guest: null,
      guest_visible: false,
    })
    .select("id, planted_at, status, pin_x, pin_y, created_at, item:items!plantings_item_id_fkey(name), asset:assets!plantings_asset_id_fkey(tags), zone:zones!plantings_zone_id_fkey(code)")
    .single();

  if (error || !created?.id) return Response.json({ error: error?.message ?? "Create failed" }, { status: 400 });

  const bedId = extractCanvasIdFromTags(tagsFromJoin(created?.asset)) ?? bed_id;

  return Response.json({
    id: String(created.id),
    bed_id: bedId,
    zone_code: codeFromJoin(created?.zone) ?? zone_code ?? null,
    crop: nameFromJoin(created?.item) ?? crop,
    status: created?.status ?? status,
    planted_at: created?.planted_at ?? planted_at ?? null,
    pin_x: created?.pin_x ?? pin_x ?? null,
    pin_y: created?.pin_y ?? pin_y ?? null,
    created_at: created?.created_at ?? null,
  });
}

export async function PATCH(req: Request) {
  const supabase = createServerSupabase();

  const gate = requireStudioToken(req);
  if (!gate.ok) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // If user edits bed_id or crop or zone_code, we translate to canonical ids.
  // Otherwise patch pin/status/planted_at directly.

  // Resolve context (optional, used only if bed/crop/zone changes)
  const workplaceSlug = String(body?.workplaceSlug ?? "olivea").trim();
  const areaName = String(body?.areaName ?? body?.gardenName ?? "Garden").trim();
  const layoutId = (body?.layoutId as string | null | undefined) ?? null;

  const needsCtx = ("crop" in body) || ("bed_id" in body) || ("zone_code" in body);
  const resolved = needsCtx
    ? await resolveContext({ supabase, workplaceSlug, areaName, layoutId })
    : { ctx: null as Context | null };

  const ctx = resolved.ctx;


  const patch: Record<string, any> = {};

  // status
  if ("status" in body) {
   const s = (body?.status as string | null | undefined)?.trim();
   if (s && ["planned", "active", "harvested", "failed", "archived"].includes(s)) {
     patch.status = s;
   }
   // else: don't touch status
  }

  // planted_at
  if ("planted_at" in body) patch.planted_at = body.planted_at ?? null;

  // pins
  if ("pin_x" in body) patch.pin_x = body.pin_x ?? null;
  if ("pin_y" in body) patch.pin_y = body.pin_y ?? null;

  // crop -> item_id
  if ("crop" in body && ctx) {
    const crop = (body?.crop as string | null | undefined)?.trim();
    if (crop) patch.item_id = await ensureItemId({ supabase, workplaceId: ctx.workplaceId, crop });
  }

  // bed_id -> asset_id
  if ("bed_id" in body && ctx) {
    const bedId = (body?.bed_id as string | null | undefined)?.trim();
    if (bedId) patch.asset_id = await ensureAssetId({ supabase, workplaceId: ctx.workplaceId, areaId: ctx.areaId, layoutId: ctx.layoutId, bedId });
  }

  // zone_code -> zone_id (requires asset_id)
  if ("zone_code" in body && ctx) {
    const z = (body?.zone_code as string | null | undefined)?.trim();
    if (!z) patch.zone_id = null;
    else {
      // Need current (or patched) asset_id
      const assetId =
        patch.asset_id ??
        (
          await supabase
            .schema("roseiies")
            .from("plantings")
            .select("asset_id")
            .eq("id", id)
            .maybeSingle()
        )?.data?.asset_id;

      if (assetId) patch.zone_id = await ensureZoneId({ supabase, workplaceId: ctx.workplaceId, assetId, zoneCode: z });
    }
  }

  const { data: updated, error } = await supabase
    .schema("roseiies")
    .from("plantings")
    .update(patch)
    .eq("id", id)
    .select("id, planted_at, status, pin_x, pin_y, created_at, item:items!plantings_item_id_fkey(name), asset:assets!plantings_asset_id_fkey(tags), zone:zones!plantings_zone_id_fkey(code)")
    .single();

  if (error || !updated?.id) return Response.json({ error: error?.message ?? "Update failed" }, { status: 400 });

  return Response.json({
    id: String(updated.id),
    bed_id: extractCanvasIdFromTags(tagsFromJoin(updated?.asset)) ?? null,
    zone_code: codeFromJoin(updated?.zone),
    crop: nameFromJoin(updated?.item),
    status: updated?.status ?? null,
    planted_at: updated?.planted_at ?? null,
    pin_x: updated?.pin_x ?? null,
    pin_y: updated?.pin_y ?? null,
    created_at: updated?.created_at ?? null,
  });  
}
