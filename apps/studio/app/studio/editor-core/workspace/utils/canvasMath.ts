// apps/studio/app/studio/editor-core/workspace/utils/canvasMath.ts

export type Pt = { x: number; y: number };
export type Rect = { x: number; y: number; w: number; h: number };

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function rectCenter(r: Rect): Pt {
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}

export function rectFromItem(it: { x: number; y: number; w: number; h: number }): Rect {
  return { x: it.x, y: it.y, w: it.w, h: it.h };
}

export function boundsOfRects(rects: Rect[]): Rect {
  if (!rects.length) return { x: 0, y: 0, w: 0, h: 0 };
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  for (const r of rects) {
    minX = Math.min(minX, r.x);
    minY = Math.min(minY, r.y);
    maxX = Math.max(maxX, r.x + r.w);
    maxY = Math.max(maxY, r.y + r.h);
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

export function translateRect(r: Rect, dx: number, dy: number): Rect {
  return { x: r.x + dx, y: r.y + dy, w: r.w, h: r.h };
}

export function centroidForNormalizedZone(zone: { x: number; y: number; w: number; h: number }): Pt {
  return { x: zone.x + zone.w / 2, y: zone.y + zone.h / 2 };
}
