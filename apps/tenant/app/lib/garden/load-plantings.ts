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

function toNum(v: any): number | null {
  if (v == null) return null;
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}

export type GardenPlanting = {
  id: string;
  tenant_id: string; // workplace slug
  garden_id: string; // area_id

  bed_id: string; // canvas item id
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

export async function loadGardenPlantings(args: { tenantId: string; gardenId: string }) {
  const supabase = getServerSupabase();

  const workplaceSlug = String(args.tenantId ?? "").trim() || "olivea";
  const areaId = String(args.gardenId ?? "").trim();
  if (!areaId) return [];

  // 1) workplace
  const { data: workplace, error: werr } = await supabase
    .schema("roseiies")
    .from("workplaces")
    .select("id, slug")
    .eq("slug", workplaceSlug)
    .maybeSingle();

  if (werr || !workplace?.id) {
    console.error("[tenant] loadGardenPlantings: workplace not found", { workplaceSlug, werr });
    return [];
  }

  // 2) plantings + joins (asset tags give us canvas bed_id)
  const { data, error } = await supabase
    .schema("roseiies")
    .from("plantings")
    .select(
      `
      id,
      workplace_id,
      area_id,
      status,
      planted_at,
      pin_x,
      pin_y,
      notes_guest,
      notes_garden,
      notes_kitchen,
      guest_visible,
      items:item_id ( id, name ),
      zones:zone_id ( id, code ),
      assets:asset_id ( id, tags )
    `
    )
    .eq("workplace_id", workplace.id)
    .eq("area_id", areaId);

  if (error) {
    console.error("[tenant] loadGardenPlantings: query error", error);
    return [];
  }

  const rows = (data ?? [])
    .map((p: any): GardenPlanting | null => {
      const canvasId = extractCanvasIdFromTags(p.assets?.tags);
      if (!canvasId) return null;

      const cropName = String(p.items?.name ?? "").trim() || "Unknown";
      const zoneCode = p.zones?.code ? String(p.zones.code) : null;

      return {
        id: String(p.id),
        tenant_id: workplaceSlug,
        garden_id: String(p.area_id),

        bed_id: String(canvasId),
        zone_code: zoneCode,

        crop: cropName,
        status: p.status ? String(p.status) : null,
        planted_at: p.planted_at ? String(p.planted_at) : null,

        pin_x: toNum(p.pin_x),
        pin_y: toNum(p.pin_y),

        guest_story: p.guest_visible ? (p.notes_guest ? String(p.notes_guest) : null) : null,
        guest_facts: null,
        gardener_notes: p.notes_garden ? String(p.notes_garden) : null,
        kitchen_notes: p.notes_kitchen ? String(p.notes_kitchen) : null,
      };
    })
    .filter(Boolean) as GardenPlanting[];

  return rows;
}
