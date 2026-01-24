// apps/studio/app/studio/editor-core/workspace/utils/itemCodes.ts

import type { StudioItem, ItemType } from "../../types";

function prefixFor(type: ItemType): string | null {
  if (type === "bed") return "BED";
  if (type === "tree") return "TREE";
  return null;
}

function pad(n: number, width = 3) {
  const s = String(n);
  return s.length >= width ? s : "0".repeat(width - s.length) + s;
}

export function nextSequentialCode(items: StudioItem[], type: ItemType): string | null {
  const prefix = prefixFor(type);
  if (!prefix) return null;

  const re = new RegExp(`^${prefix}-(\\d+)$`);
  let max = 0;

  for (const it of items) {
    const code = (it.meta as any)?.code;
    if (!code || typeof code !== "string") continue;
    const m = code.match(re);
    if (!m) continue;
    const num = Number(m[1]);
    if (Number.isFinite(num)) max = Math.max(max, num);
  }

  return `${prefix}-${pad(max + 1)}`;
}

export function ensureItemCode(args: {
  itemsContext: StudioItem[];
  type: ItemType;
  existingCode?: unknown;
}): string | undefined {
  const { itemsContext, type, existingCode } = args;

  const prefix = prefixFor(type);
  if (!prefix) return undefined;

  if (typeof existingCode === "string" && existingCode.startsWith(`${prefix}-`)) {
    return existingCode;
  }

  return nextSequentialCode(itemsContext, type) ?? undefined;
}
