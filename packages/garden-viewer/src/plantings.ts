import type { GardenViewerItem, GardenViewerPlanting } from "./types";

type ZoneRect = { code: string; x: number; y: number; w: number; h: number };

function getZonesFromBedMeta(bed: GardenViewerItem): ZoneRect[] {
  const zones = bed?.meta?.zones;
  if (!Array.isArray(zones)) return [];
  return zones
    .map((z: any) => ({
      code: String(z?.code ?? "").trim(),
      x: Number(z?.x),
      y: Number(z?.y),
      w: Number(z?.w),
      h: Number(z?.h),
    }))
    .filter((z: ZoneRect) => !!z.code && Number.isFinite(z.x) && Number.isFinite(z.y) && Number.isFinite(z.w) && Number.isFinite(z.h));
}

function zoneCentroidWorld(bed: GardenViewerItem, zoneCode: string) {
  const code = String(zoneCode ?? "").trim();
  if (!code) return null;

  const zones = getZonesFromBedMeta(bed);
  const z = zones.find((x) => String(x.code).trim() === code);
  if (!z) return null;

  const cx = (z.x + z.w / 2) * bed.w;
  const cy = (z.y + z.h / 2) * bed.h;
  return { x: bed.x + cx, y: bed.y + cy };
}

export function plantingWorldPoint(p: GardenViewerPlanting, bed: GardenViewerItem) {
  if (p.pin_x != null && p.pin_y != null) {
    return { x: bed.x + (p.pin_x as number) * bed.w, y: bed.y + (p.pin_y as number) * bed.h };
  }
  if (p.zone_code) {
    const zc = zoneCentroidWorld(bed, p.zone_code);
    if (zc) return zc;
  }
  return { x: bed.x + bed.w / 2, y: bed.y + bed.h / 2 };
}
