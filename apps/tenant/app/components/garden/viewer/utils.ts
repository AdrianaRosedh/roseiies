import type { GardenPlanting } from "@/lib/garden/load-plantings";
import type { Role, RoleCard, Item, PlantingsByBed } from "./types";

export const ROSE_BLUE = "#10bbbf";

export function rgba(hex: string, opacity: number) {
  const h = String(hex ?? "#010506").replace("#", "").trim();
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}

export function roleCard(p: GardenPlanting, role: Role): RoleCard {
  if (role === "guest") {
    return { title: p.crop, subtitle: p.status ?? "growing", body: p.guest_story ?? "" };
  }
  if (role === "gardener") {
    return {
      title: p.crop,
      subtitle: p.planted_at ? `planted: ${p.planted_at}` : "ops",
      body: p.gardener_notes ?? "",
    };
  }
  return { title: p.crop, subtitle: p.status ?? "kitchen", body: p.kitchen_notes ?? "" };
}

export function buildPlantingsByBed(plantings: GardenPlanting[]): PlantingsByBed {
  const m = new Map<string, GardenPlanting[]>();
  for (const p of plantings) {
    const arr = m.get(p.bed_id) ?? [];
    arr.push(p);
    m.set(p.bed_id, arr);
  }
  return m;
}

export function getBeds(items: Item[]) {
  return items.filter((i) => i.type === "bed");
}

export function findBed(items: Item[], bedId: string | null) {
  if (!bedId) return null;
  return items.find((b) => b.id === bedId) ?? null;
}
