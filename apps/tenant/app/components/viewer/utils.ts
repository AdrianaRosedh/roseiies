import type { ViewerItem } from "@/lib/views/load-view";

export function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

export function sortByOrder(items: ViewerItem[]) {
  return [...(items ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export function isBedLike(it: ViewerItem) {
  const t = String(it?.type ?? "").toLowerCase();
  return t === "bed" || t === "tree" || t === "structure";
}
