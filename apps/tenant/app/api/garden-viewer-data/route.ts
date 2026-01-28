// apps/tenant/app/api/garden-viewer-data/route.ts
import { createServerSupabase } from "@roseiies/supabase/server";

function extractCanvasIdFromTags(tags: unknown): string | null {
  if (!Array.isArray(tags)) return null;
  for (const t of tags) {
    const s = String(t ?? "");
    if (s.startsWith("canvas:")) return s.slice("canvas:".length);
  }
  return null;
}

function toNum(v: any): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

type Item = {
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
};

type GardenPlanting = {
  id: string;
  bed_id: string;
  zone_code: string | null;
  crop: string;
  status: string | null;
  planted_at: string | null;
  pin_x: number | null;
  pin_y: number | null;

  guest_story: string | null;
  guest_facts: any | null;
  gardener_notes: string | null;
  kitchen_notes: string | null;
};

export async function GET(req: Request) {
  const supabase = createServerSupabase();
  const url = new URL(req.url);

  const layoutId = (url.searchParams.get("layoutId") ?? "").trim();
  const areaId = (url.searchParams.get("areaId") ?? "").trim();

  const mode = (url.searchParams.get("mode") ?? "guest").trim().toLowerCase();
  const isTeam = mode === "team";

  if (!layoutId) return Response.json({ error: "Missing layoutId" }, { status: 400 });
  if (!areaId) return Response.json({ error: "Missing areaId" }, { status: 400 });

  const ok = (payload: {
    canvas?: any;
    items?: any;
    plantings?: any;
    error?: any;
  }) =>
    Response.json({
      canvas: payload.canvas ?? { width: 1500, height: 1700 },
      items: Array.isArray(payload.items) ? payload.items : [],
      plantings: Array.isArray(payload.plantings) ? payload.plantings : [],
      layoutId,
      areaId,
      mode: isTeam ? "team" : "guest",
      // helpful debug (harmless)
      _meta: payload.error ? { warning: String(payload.error) } : undefined,
    });

  // 1) layout
  const { data: layout, error: lerr } = await supabase
    .schema("roseiies")
    .from("layouts")
    .select("id, doc_json, area_id")
    .eq("id", layoutId)
    .maybeSingle();

  if (lerr || !layout?.id) return ok({ error: lerr?.message ?? "Layout not found" });

  if (String((layout as any).area_id) !== areaId) {
    return ok({ error: "layoutId does not belong to areaId" });
  }

  const canvas =
    (layout as any)?.doc_json?.canvas && typeof (layout as any).doc_json.canvas === "object"
      ? (layout as any).doc_json.canvas
      : { width: 1500, height: 1700 };

  // 2) assets -> items
  const { data: assets, error: aerr } = await supabase
    .schema("roseiies")
    .from("assets")
    .select("id, type, name, tags, geom, style")
    .eq("layout_id", layoutId)
    .order("created_at", { ascending: true });

  if (aerr) return ok({ canvas, items: [], plantings: [], error: aerr.message });

  const items: Item[] = (assets ?? [])
    .map((a: any) => {
      const canvasId = extractCanvasIdFromTags(a.tags);
      if (!canvasId) return null;

      const g = a.geom ?? {};
      return {
        id: canvasId,
        type: String(a.type ?? "bed"),
        x: Number(g.x ?? 0),
        y: Number(g.y ?? 0),
        w: Number(g.w ?? 120),
        h: Number(g.h ?? 80),
        r: Number(g.r ?? 0),
        order: Number(g.order ?? 0),
        label: String(a.name ?? canvasId),
        meta: g.meta ?? {},
        style: a.style ?? {},
      } as Item;
    })
    .filter(Boolean) as Item[];

  // 3) plantings
  let q = supabase
    .schema("roseiies")
    .from("plantings")
    .select(
      `
      id,
      planted_at,
      status,
      pin_x,
      pin_y,
      notes_guest,
      notes_garden,
      notes_kitchen,
      guest_visible,
      item:items!plantings_item_id_fkey(name),
      asset:assets!plantings_asset_id_fkey(tags),
      zone:zones!plantings_zone_id_fkey(code)
    `
    )
    .eq("area_id", areaId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (!isTeam) q = q.eq("guest_visible", true);

  const { data: plantingsRaw, error: perr } = await q;

  if (perr) return ok({ canvas, items, plantings: [], error: perr.message });

  const plantings: GardenPlanting[] = (plantingsRaw ?? [])
    .map((r: any) => {
      const bed_id = extractCanvasIdFromTags(r?.asset?.tags) ?? null;
      const crop = r?.item?.name ? String(r.item.name) : null;
      if (!bed_id || !crop) return null;

      return {
        id: String(r.id),
        bed_id,
        zone_code: r?.zone?.code ? String(r.zone.code) : null,
        crop,
        status: r?.status ?? null,
        planted_at: r?.planted_at ?? null,
        pin_x: toNum(r?.pin_x),
        pin_y: toNum(r?.pin_y),
        guest_story: r?.notes_guest ?? null,
        guest_facts: null,
        gardener_notes: r?.notes_garden ?? null,
        kitchen_notes: r?.notes_kitchen ?? null,
      };
    })
    .filter(Boolean) as GardenPlanting[];

  return ok({ canvas, items, plantings });
}
