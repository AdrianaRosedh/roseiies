// apps/studio/app/studio/editor-core/canvas/item/utils/predicates.ts

import type { StudioItem } from "../../../types";

export function isPillLike(item: StudioItem) {
  return item.type === "path" || item.type === "label";
}

export function isRectLike(item: StudioItem) {
  return item.type === "bed" || item.type === "zone" || item.type === "structure";
}

export function isTree(item: StudioItem) {
  return item.type === "tree";
}
