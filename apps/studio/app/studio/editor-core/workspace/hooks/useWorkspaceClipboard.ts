// apps/studio/app/studio/editor-core/workspace/hooks/useWorkspaceClipboard.ts

import { useRef, useState } from "react";
import type { LayoutDoc, StudioItem, StudioModule, WorkspaceStore } from "../../types";
import { uid } from "../utils/ids";
import { boundsOfRects, rectFromItem } from "../utils/canvasMath";
import { ensureItemCode } from "../utils/itemCodes";

export function useWorkspaceClipboard(args: {
  module: StudioModule;
  doc: LayoutDoc;
  state: WorkspaceStore;
  updateDoc: (patch: Partial<LayoutDoc>) => void;
  selectedItems: StudioItem[];
  setSelectedIds: (ids: string[]) => void;
}) {
  const { doc, updateDoc, selectedItems, setSelectedIds } = args;

  const cursorWorldRef = useRef<{ x: number; y: number } | null>(null);
  const viewportCenterWorldRef = useRef<{ x: number; y: number } | null>(null);

  const [clipboard, setClipboard] = useState<StudioItem[] | null>(null);

  function setCursorWorld(pos: { x: number; y: number } | null) {
    cursorWorldRef.current = pos;
  }

  function setViewportCenterWorld(pos: { x: number; y: number } | null) {
    viewportCenterWorldRef.current = pos;
  }

  function copySelected() {
    if (selectedItems.length === 0) return;

    // Deep-ish copy to prevent shared references for meta/style
    setClipboard(
      selectedItems.map((it) => ({
        ...it,
        meta: {
          ...it.meta,
          plants: it.meta.plants ? [...it.meta.plants] : it.meta.plants,
        },
        style: {
          ...it.style,
          shadow: it.style.shadow ? { ...it.style.shadow } : undefined,
        },
      }))
    );
  }

  function pasteAtCursor() {
    if (!clipboard || clipboard.length === 0) return;

    const anchor =
      cursorWorldRef.current ??
      viewportCenterWorldRef.current ??
      { x: 240, y: 240 };

    // Compute bounding box of clipboard items (world coords)
    const rects = clipboard.map((i) => rectFromItem(i));
    const bounds = boundsOfRects(rects);

    const targetX = anchor.x - bounds.w / 2;
    const targetY = anchor.y - bounds.h / 2;

    const dx = targetX - bounds.x;
    const dy = targetY - bounds.y;

    // Build up a context list so sequential codes don't collide within the same paste batch
    const contextItems: StudioItem[] = [...doc.items];

    const pasted = clipboard.map((it) => {
      const nextId = uid(it.type);

      // Preserve most meta, but ensure codes are regenerated for bed/tree
      const nextMeta: any = {
        ...it.meta,
        plants: it.meta.plants ? [...it.meta.plants] : it.meta.plants,
      };

      // ✅ Avoid duplicated codes on paste (beds/trees only)
      nextMeta.code = ensureItemCode({
        itemsContext: contextItems,
        type: it.type,
        existingCode: nextMeta.code,
      });

      const nextItem: StudioItem = {
        ...it,
        id: nextId,
        x: it.x + dx,
        y: it.y + dy,
        meta: nextMeta,
        style: {
          ...it.style,
          shadow: it.style.shadow ? { ...it.style.shadow } : undefined,
        },
      };

      // Push into context so the next pasted item gets the next sequence number
      contextItems.push(nextItem);

      return nextItem;
    });

    updateDoc({ items: [...doc.items, ...pasted] });
    setSelectedIds(pasted.map((p) => p.id));
  }

  return {
    clipboard,
    copySelected,
    pasteAtCursor,
    setCursorWorld,
    setViewportCenterWorld,
  } as const;
}
