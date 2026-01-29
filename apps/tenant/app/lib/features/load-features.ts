import { createClient } from "@supabase/supabase-js";
import type { FeatureBundle, MapFeature } from "./types";

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

function uniq(xs: string[]) {
  return Array.from(new Set((xs ?? []).map((x) => String(x ?? "").trim()).filter(Boolean)));
}

export async function loadFeaturesForView(args: {
  workplaceId: string;
  areaId: string;
  areaKind: string | null;
  assetIds: string[];          // DB asset ids (from items.meta.db_id)
  mode: "guest" | "team";
}): Promise<FeatureBundle> {
  const kind = String(args.areaKind ?? "").toLowerCase();
  const assetIds = uniq(args.assetIds);

  if (!args.workplaceId || !args.areaId || assetIds.length === 0) {
    return { features: [] };
  }

  // ✅ v1: garden supports planting features
  if (kind === "garden") {
    const features = await loadGardenPlantingFeatures({
      workplaceId: args.workplaceId,
      areaId: args.areaId,
      assetIds,
      mode: args.mode,
    });
    return { features };
  }

  return { features: [] };
}

async function loadGardenPlantingFeatures(args: {
  workplaceId: string;
  areaId: string;
  assetIds: string[];
  mode: "guest" | "team";
}): Promise<MapFeature[]> {
  const supabase = getServerSupabase();
  const isTeam = args.mode === "team";

  // ✅ canonical plantings query (matches your Studio API style)
  let q = supabase
    .schema("roseiies")
    .from("plantings")
    .select(
      `
      id,
      status,
      planted_at,
      pin_x,
      pin_y,
      notes_guest,
      notes_garden,
      notes_kitchen,
      guest_visible,
      asset_id,
      area_id,
      item:items!plantings_item_id_fkey(name),
      zone:zones!plantings_zone_id_fkey(code)
    `
    )
    .eq("workplace_id", args.workplaceId)
    .eq("area_id", args.areaId)
    .in("asset_id", args.assetIds)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (!isTeam) q = q.eq("guest_visible", true);

  const { data, error } = await q;

  if (error) {
    console.error("[tenant] loadGardenPlantingFeatures error", {
      message: error.message,
      details: (error as any).details,
      hint: (error as any).hint,
      code: (error as any).code,
    });
    return [];
  }

  return (data ?? []).map((r: any) => {
    const cropName = r?.item?.name ? String(r.item.name) : "Unknown";
    const zoneCode = r?.zone?.code ? String(r.zone.code) : null;

    return {
      id: String(r.id),
      asset_id: String(r.asset_id),            // ✅ DB asset id (maps to item.meta.db_id)
      kind: "planting",
      title: cropName,
      subtitle: r?.status ?? null,
      meta: {
        zone_code: zoneCode,
        status: r?.status ?? null,
        planted_at: r?.planted_at ?? null,
        pin_x: r?.pin_x ?? null,
        pin_y: r?.pin_y ?? null,
        guest_story: r?.notes_guest ?? null,
        gardener_notes: r?.notes_garden ?? null,
        kitchen_notes: r?.notes_kitchen ?? null,
        guest_visible: r?.guest_visible ?? null,
      },
    } satisfies MapFeature;
  });
}
