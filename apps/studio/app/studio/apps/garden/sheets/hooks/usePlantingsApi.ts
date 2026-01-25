// apps/studio/app/studio/apps/garden/sheets/hooks/usePlantingsApi.ts
"use client";

import { studioWriteFetch } from "@/app/lib/http/studioFetch";
import type { PlantingRow } from "../types";

export async function apiGetPlantings(gardenName: string) {
  const res = await fetch(`/api/plantings?areaName=${encodeURIComponent(gardenName)}&workplaceSlug=olivea`);
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;

  if (res.status === 404) return [] as PlantingRow[];
  if (!res.ok) throw new Error(json?.error ?? `GET /api/plantings failed (${res.status})`);

  const rows = (Array.isArray(json?.rows) ? json.rows : []) as PlantingRow[];
  return rows;
}

export async function apiCreatePlanting(args: { gardenName: string; row: Omit<PlantingRow, "id"> }) {
  const { gardenName, row } = args;

  const payload = {
    workplaceSlug: "olivea",
    areaName: gardenName,
    bed_id: row.bed_id,
    zone_code: row.zone_code,
    crop: row.crop,
    status: row.status,
    planted_at: row.planted_at,
    pin_x: row.pin_x,
    pin_y: row.pin_y,
  };

  const res = await studioWriteFetch("/api/plantings", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  const json = text ? JSON.parse(text) : null;

  if (!res.ok) throw new Error(json?.error ?? `POST /api/plantings failed (${res.status})`);
  return json as PlantingRow;
}

export async function apiPatchPlanting(args: {
  id: string;
  patch: Partial<Pick<PlantingRow, "bed_id" | "zone_code" | "crop" | "status" | "planted_at" | "pin_x" | "pin_y">>;
}) {
  const { id, patch } = args;

  const res = await studioWriteFetch(`/api/plantings?id=${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ workplaceSlug: "olivea", areaName: "Garden", ...patch }),
  });

  const text = await res.text();
  const json = text ? JSON.parse(text) : null;

  if (!res.ok) throw new Error(json?.error ?? `PATCH /api/plantings failed (${res.status})`);
  return json as PlantingRow;
}
