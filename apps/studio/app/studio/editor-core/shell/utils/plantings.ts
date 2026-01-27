import type { LayoutDoc } from "../../types";

export type PlantingRow = {
  id: string;
  bed_id: string | null;
  zone_code: string | null;
  crop: string | null;
  status: string | null;
  planted_at: string | null;
  pin_x: number | null;
  pin_y: number | null;

  // legacy optional fields (safe)
  garden_id?: string | null;
  created_at?: string | null;
};

export function sanitizePlantingsForDoc(doc: LayoutDoc, plantings: PlantingRow[]) {
  const items = doc?.items ?? [];
  const beds = items.filter((it: any) => it.type === "bed");
  const validItemIds = new Set(items.map((it: any) => it.id));

  const zonesForBed = (bedId: string) => {
    const bed = beds.find((b: any) => b.id === bedId);
    const zones = bed?.meta?.zones;
    if (!Array.isArray(zones)) return [];
    return zones.map((z: any) => String(z?.code ?? "").trim()).filter(Boolean);
  };

  return (plantings ?? [])
    .filter((p) => p && p.bed_id && validItemIds.has(p.bed_id))
    .map((p) => {
      const bedId = p.bed_id as string;
      const allowed = zonesForBed(bedId);
      const z = p.zone_code ? String(p.zone_code).trim() : null;

      // If bed defines zones, validate. If not, keep zone_code.
      const zone_code = allowed.length === 0 ? z : z && allowed.includes(z) ? z : null;

      return { ...p, zone_code };
    });
}
