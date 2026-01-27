"use client";

import { useEffect, useMemo } from "react";
import type { LayoutDoc, StudioItem } from "../../types";

export type AlignTo = "selection" | "plot";

function boundsOf(items: StudioItem[]) {
  if (!items.length) return { minX: 0, minY: 0, maxX: 0, maxY: 0, w: 0, h: 0 };
  const minX = Math.min(...items.map((i) => i.x));
  const minY = Math.min(...items.map((i) => i.y));
  const maxX = Math.max(...items.map((i) => i.x + i.w));
  const maxY = Math.max(...items.map((i) => i.y + i.h));
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
}

export function useArrangeTools(args: {
  doc: LayoutDoc;
  store: any;
  selectedItems: StudioItem[];
  anyLocked: boolean;

  alignTo: AlignTo;
  snapToGrid: boolean;
  snapStep: number;
}) {
  const { doc, store, selectedItems, anyLocked, alignTo, snapToGrid, snapStep } =
    args;

  const canArrange = selectedItems.length >= 2 && !anyLocked;
  const canDistribute = selectedItems.length >= 3 && !anyLocked;

  function snapPatch(id: string, patch: any) {
    const it = (doc.items ?? []).find((x: any) => x.id === id);
    const isTree = it?.type === "tree";
    if (!snapToGrid || isTree) return patch;

    const round = (v: number) => Math.round(v / snapStep) * snapStep;
    const next = { ...patch };

    if (typeof next.x === "number") next.x = round(next.x);
    if (typeof next.y === "number") next.y = round(next.y);
    if (typeof next.w === "number") next.w = Math.max(1, round(next.w));
    if (typeof next.h === "number") next.h = Math.max(1, round(next.h));

    return next;
  }

  function bringForward() {
    if (!selectedItems.length) return;
    store.updateItemsBatch?.(
      selectedItems.map((it: any) => ({
        id: it.id,
        patch: { order: (it.order ?? 0) + 1 },
      }))
    );
  }

  function sendBackward() {
    if (!selectedItems.length) return;
    store.updateItemsBatch?.(
      selectedItems.map((it: any) => ({
        id: it.id,
        patch: { order: (it.order ?? 0) - 1 },
      }))
    );
  }

  function bringToFront() {
    if (!selectedItems.length) return;
    const maxOrder = (doc.items ?? []).reduce(
      (m: number, it: any) => Math.max(m, it.order ?? 0),
      0
    );
    const sorted = [...selectedItems].sort(
      (a: any, b: any) => (a.order ?? 0) - (b.order ?? 0)
    );

    store.updateItemsBatch?.(
      sorted.map((it: any, idx: number) => ({
        id: it.id,
        patch: { order: maxOrder + 1 + idx },
      }))
    );
  }

  function sendToBack() {
    if (!selectedItems.length) return;
    const minOrder = (doc.items ?? []).reduce(
      (m: number, it: any) => Math.min(m, it.order ?? 0),
      0
    );
    const sorted = [...selectedItems].sort(
      (a: any, b: any) => (a.order ?? 0) - (b.order ?? 0)
    );

    store.updateItemsBatch?.(
      sorted.map((it: any, idx: number) => ({
        id: it.id,
        patch: { order: minOrder - sorted.length + idx },
      }))
    );
  }

  function getAlignFrame(): { x: number; y: number; w: number; h: number } | null {
    if (selectedItems.length < 2) return null;

    if (alignTo === "plot") {
      return { x: 0, y: 0, w: doc.canvas.width, h: doc.canvas.height };
    }

    const b = boundsOf(selectedItems);
    return { x: b.minX, y: b.minY, w: b.w, h: b.h };
  }

  function alignSelected(
    k: "left" | "center" | "right" | "top" | "middle" | "bottom"
  ) {
    if (!canArrange) return;
    const frame = getAlignFrame();
    if (!frame) return;

    const { x, y, w, h } = frame;
    const patches: Array<{ id: string; patch: Partial<StudioItem> }> = [];

    selectedItems.forEach((it) => {
      if (it.meta?.locked) return;

      let nx = it.x;
      let ny = it.y;

      if (k === "left") nx = x;
      if (k === "center") nx = x + w / 2 - it.w / 2;
      if (k === "right") nx = x + w - it.w;

      if (k === "top") ny = y;
      if (k === "middle") ny = y + h / 2 - it.h / 2;
      if (k === "bottom") ny = y + h - it.h;

      patches.push({ id: it.id, patch: snapPatch(it.id, { x: nx, y: ny }) });
    });

    store.updateItemsBatch?.(patches);
  }

  function distributeSelected(axis: "x" | "y") {
    if (!canDistribute) return;

    const items = [...selectedItems].filter((it) => !it.meta?.locked);
    if (items.length < 3) return;

    const patches: Array<{ id: string; patch: Partial<StudioItem> }> = [];

    if (axis === "x") {
      const sorted = items.sort((a, b) => a.x - b.x);
      const b = boundsOf(sorted);
      const totalW = sorted.reduce((sum, it) => sum + it.w, 0);
      const gaps = sorted.length - 1;
      const gap = gaps > 0 ? (b.w - totalW) / gaps : 0;

      let cursor = b.minX;
      sorted.forEach((it) => {
        patches.push({ id: it.id, patch: snapPatch(it.id, { x: cursor, y: it.y }) });
        cursor += it.w + gap;
      });

      store.updateItemsBatch?.(patches);
      return;
    }

    const sorted = items.sort((a, b) => a.y - b.y);
    const b = boundsOf(sorted);
    const totalH = sorted.reduce((sum, it) => sum + it.h, 0);
    const gaps = sorted.length - 1;
    const gap = gaps > 0 ? (b.h - totalH) / gaps : 0;

    let cursor = b.minY;
    sorted.forEach((it) => {
      patches.push({ id: it.id, patch: snapPatch(it.id, { x: it.x, y: cursor }) });
      cursor += it.h + gap;
    });

    store.updateItemsBatch?.(patches);
  }

  // hotkeys: ⌘] / ⌘[ and shift variants
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      if (e.key === "]") {
        e.preventDefault();
        if (e.shiftKey) bringToFront();
        else bringForward();
      }
      if (e.key === "[") {
        e.preventDefault();
        if (e.shiftKey) sendToBack();
        else sendBackward();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.items, selectedItems]);

  return {
    canArrange,
    canDistribute,
    bringForward,
    sendBackward,
    bringToFront,
    sendToBack,
    alignSelected,
    distributeSelected,
  };
}
