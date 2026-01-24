"use client";

import { useMemo } from "react";
import type { LayoutDoc, StudioItem } from "../../types";

function isTree(item: StudioItem) {
  return item.type === "tree";
}

export function useItemsIndex(args: { doc: LayoutDoc; selectedIds: string[] }) {
  const itemsSorted = useMemo(
    () => [...args.doc.items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [args.doc.items]
  );

  const selectedSet = useMemo(() => new Set(args.selectedIds), [args.selectedIds]);

  const selectedItems = useMemo(
    () => args.doc.items.filter((i) => selectedSet.has(i.id)),
    [args.doc.items, selectedSet]
  );

  const single = selectedItems.length === 1 ? selectedItems[0] : null;
  const anyLocked = selectedItems.some((it) => Boolean(it.meta?.locked));
  const isSingleTree = single ? isTree(single) : false;

  return useMemo(
    () => ({
      itemsSorted,
      selectedSet,
      selectedItems,
      single,
      anyLocked,
      isSingleTree,
    }),
    [itemsSorted, selectedSet, selectedItems, single, anyLocked, isSingleTree]
  );
}
