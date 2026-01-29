import { createServerSupabase } from "@roseiies/supabase/server";

function extractCanvasIdFromTags(tags: unknown): string | null {
  if (!Array.isArray(tags)) return null;
  for (const t of tags) {
    const s = String(t ?? "");
    if (s.startsWith("canvas:")) return s.slice("canvas:".length);
  }
  return null;
}

function n(v: any, fallback = 0) {
  const x = Number(v);
  return Number.isFinite(x) ? x : fallback;
}

function canvasFromDoc(doc_json: any) {
  const c = doc_json?.canvas;
  if (c && typeof c === "object") {
    return {
      width: n(c.width, 1500),
      height: n(c.height, 1700),
    };
  }
  return { width: 1500, height: 1700 };
}

export type ViewerItem = {
  id: string;       // canvas id (string)
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

function itemsFromAssets(assets: any[]): ViewerItem[] {
  return (assets ?? [])
    .map((a: any) => {
      const canvasId = extractCanvasIdFromTags(a.tags);
      if (!canvasId) return null;

      const geom = a.geom ?? {};

      // Inject DB asset id into meta so tenant can map plantings correctly later
      const meta = {
        ...(geom.meta ?? {}),
        db_id: a.id,
        bed_id: a.id,
      };

      return {
        id: String(canvasId),
        type: String(a.type ?? "bed"),
        x: n(geom.x),
        y: n(geom.y),
        w: n(geom.w, 120),
        h: n(geom.h, 80),
        r: n(geom.r),
        order: n(geom.order),
        label: String(a.name ?? "").trim() || String(canvasId),
        meta,
        style: a.style ?? {},
      } as ViewerItem;
    })
    .filter(Boolean)
    .sort((a: any, b: any) => n(a.order) - n(b.order)) as ViewerItem[];
}

export async function loadViewById(args: { viewId: string }) {
  const supabase = createServerSupabase();

  const viewId = String(args?.viewId ?? "").trim();
  if (!viewId) return null;

  const { data: layout, error: lerr } = await supabase
    .schema("roseiies")
    .from("layouts")
    .select("id, name, doc_json, workplace_id, area_id")
    .eq("id", viewId)
    .maybeSingle();

  if (lerr || !layout?.id) {
    console.error("[tenant] loadViewById: layout not found", { viewId, lerr });
    return null;
  }

  const { data: workplace } = await supabase
    .schema("roseiies")
    .from("workplaces")
    .select("id, slug, name")
    .eq("id", layout.workplace_id)
    .maybeSingle();

  const { data: area } = await supabase
    .schema("roseiies")
    .from("areas")
    .select("id, name, kind")
    .eq("id", layout.area_id)
    .maybeSingle();

  const { data: assets, error: aerr } = await supabase
    .schema("roseiies")
    .from("assets")
    .select("id, type, name, tags, geom, style, updated_at")
    .eq("layout_id", layout.id)
    .order("updated_at", { ascending: true });

  if (aerr) {
    console.error("[tenant] loadViewById: assets error", aerr);
    return null;
  }

  return {
    layout: {
      id: layout.id,
      name: layout.name ?? "View",
      canvas: canvasFromDoc((layout as any).doc_json),

      workplace_id: layout.workplace_id,
      area_id: layout.area_id,

      workplace_name: workplace?.name ?? null,
      workplace_slug: workplace?.slug ?? null,

      area_name: area?.name ?? null,
      area_kind: (area as any)?.kind ?? null,
    },
    items: itemsFromAssets(assets ?? []),
  };
}
