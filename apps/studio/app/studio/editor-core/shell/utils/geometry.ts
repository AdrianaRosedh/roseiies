import type { StudioItem } from "../../types";

export function boundsOf(items: StudioItem[]) {
  if (!items.length) return { minX: 0, minY: 0, maxX: 0, maxY: 0, w: 0, h: 0 };
  const minX = Math.min(...items.map((i) => i.x));
  const minY = Math.min(...items.map((i) => i.y));
  const maxX = Math.max(...items.map((i) => i.x + i.w));
  const maxY = Math.max(...items.map((i) => i.y + i.h));
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
}
