// apps/studio/app/studio/editor-core/hooks/usePlantingsRealtime.ts
"use client";

// Drop-in compatibility hook: now powered by GardenStore (no duplicate fetch/realtime)
import { useMemo } from "react";
import type { LayoutDoc } from "../types";
import { useGardenStore } from "../../apps/garden/GardenStore";

export type PlantingRow = {
  id: string;
  bed_id: string | null;
  zone_code: string | null;
  crop: string | null;
  status: string | null;
  planted_at: string | null;
  pin_x: number | null;
  pin_y: number | null;
  created_at?: string | null;
};

function sanitizePlantingsForDoc(doc: LayoutDoc, plantings: PlantingRow[]) {
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
      const zone_code = allowed.length === 0 ? z : z && allowed.includes(z) ? z : null;
      return { ...p, zone_code };
    });
}

export function usePlantingsRealtime(args: {
  tenantId: string | null;
  gardenName: string | null;
  doc: LayoutDoc;
}) {
  const store = useGardenStore();

  const rows = useMemo(
    () => sanitizePlantingsForDoc(args.doc, store.rows as PlantingRow[]),
    [args.doc, store.rows]
  );

  return {
    rows,
    reload: (force?: boolean) => store.refresh({ force: Boolean(force) }),
  };
}
