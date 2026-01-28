import { createClient } from "@supabase/supabase-js";

function getServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE;

  if (!url || !serviceKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY (server env). Add it to apps/tenant env."
    );
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}

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

type ViewerItem = {
  id: string; // MUST be canvas item id for bed/asset mapping
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

export async function loadPublishedGardenLayout(tenantId: string) {
  const supabase = getServerSupabase();

  // tenantId here is a workplace slug (e.g. "olivea")
  const workplaceSlug = String(tenantId ?? "").trim() || "olivea";
  const gardenName = "Garden";

  // 1) workplace
  const { data: workplace, error: werr } = await supabase
    .schema("roseiies")
    .from("workplaces")
    .select("id, slug, name")
    .eq("slug", workplaceSlug)
    .maybeSingle();

  if (werr || !workplace?.id) {
    console.error("[tenant] loadPublishedGardenLayout: workplace not found", {
      workplaceSlug,
      werr,
    });
    return null;
  }

  // 2) area (prefer name="Garden", fallback to kind="garden")
  let areaId: string | null = null;

  const { data: areaByName, error: aNameErr } = await supabase
    .schema("roseiies")
    .from("areas")
    .select("id, name, kind")
    .eq("workplace_id", workplace.id)
    .eq("name", gardenName)
    .maybeSingle();

  if (aNameErr) {
    console.error("[tenant] loadPublishedGardenLayout: area(name) error", aNameErr);
  }

  if (areaByName?.id) {
    areaId = areaByName.id;
  } else {
    const { data: areaByKind, error: aKindErr } = await supabase
      .schema("roseiies")
      .from("areas")
      .select("id, name, kind")
      .eq("workplace_id", workplace.id)
      .eq("kind", "garden")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (aKindErr) {
      console.error("[tenant] loadPublishedGardenLayout: area(kind) error", aKindErr);
    }
    areaId = areaByKind?.id ?? null;
  }

  if (!areaId) {
    console.error("[tenant] loadPublishedGardenLayout: no area found", {
      workplaceId: workplace.id,
      gardenName,
    });
    return null;
  }

  // 3) active layout (fallback to latest if none active)
  let layoutRow:
    | {
        id: string;
        name: string | null;
        version: number | null;
        is_active: boolean | null;
        doc_json: any;
      }
    | null = null;

  const { data: activeLayout, error: lActiveErr } = await supabase
    .schema("roseiies")
    .from("layouts")
    .select("id, name, version, is_active, doc_json, updated_at")
    .eq("workplace_id", workplace.id)
    .eq("area_id", areaId)
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lActiveErr) {
    console.error("[tenant] loadPublishedGardenLayout: active layout error", lActiveErr);
  }

  layoutRow = (activeLayout as any) ?? null;

  if (!layoutRow?.id) {
    const { data: latestLayout, error: lLatestErr } = await supabase
      .schema("roseiies")
      .from("layouts")
      .select("id, name, version, is_active, doc_json, updated_at")
      .eq("workplace_id", workplace.id)
      .eq("area_id", areaId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lLatestErr) {
      console.error("[tenant] loadPublishedGardenLayout: latest layout error", lLatestErr);
    }

    layoutRow = (latestLayout as any) ?? null;
  }

  if (!layoutRow?.id) {
    console.error("[tenant] loadPublishedGardenLayout: no layout found", {
      workplaceId: workplace.id,
      areaId,
    });
    return null;
  }

  const canvas =
    layoutRow?.doc_json?.canvas && typeof layoutRow.doc_json.canvas === "object"
      ? {
          width: n(layoutRow.doc_json.canvas.width, 900),
          height: n(layoutRow.doc_json.canvas.height, 560),
        }
      : { width: 900, height: 560 };

  // 4) assets → viewer items
  const { data: assets, error: asErr } = await supabase
    .schema("roseiies")
    .from("assets")
    .select("id, type, name, tags, geom, style, updated_at")
    .eq("workplace_id", workplace.id)
    .eq("area_id", areaId)
    .eq("layout_id", layoutRow.id);

  if (asErr) {
    console.error("[tenant] loadPublishedGardenLayout: assets error", asErr);
    return null;
  }

  const items: ViewerItem[] = (assets ?? [])
    .map((a: any) => {
      const canvasId = extractCanvasIdFromTags(a.tags);
      if (!canvasId) return null;

      const geom = a.geom ?? {};
      const meta = geom.meta ?? {};

      return {
        // CRITICAL: id must be canvas item id so plantings bed_id matches
        id: String(canvasId),
        type: String(a.type ?? "bed"),
        x: n(geom.x),
        y: n(geom.y),
        w: n(geom.w, 120),
        h: n(geom.h, 80),
        r: n(geom.r),
        order: n(geom.order),
        label: String(a.name ?? meta.label ?? "").trim(),
        meta,
        style: a.style ?? {},
      } as ViewerItem;
    })
    .filter(Boolean)
    .sort((a: any, b: any) => n(a.order) - n(b.order)) as ViewerItem[];

  return {
    layout: {
      id: layoutRow.id,
      // keep the same field name your page already uses
      garden_id: areaId,
      name: layoutRow.name ?? "Garden Layout",
      canvas,
    },
    items,
  };
}
