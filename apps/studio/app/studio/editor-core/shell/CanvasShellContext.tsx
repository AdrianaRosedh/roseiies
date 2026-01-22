"use client";

import React, { createContext, useContext, useMemo, useState, useCallback } from "react";
import type { LayoutDoc, StudioItem } from "../types";

type Ctx = {
  // view
  showGrid: boolean;
  setShowGrid: (v: boolean) => void;

  snapToGrid: boolean;
  setSnapToGrid: (v: boolean) => void;

  snapStep: number;

  // cursor
  cursorWorld: { x: number; y: number } | null;
  setCursorWorld: (p: { x: number; y: number } | null) => void;

  // selection
  selectedIds: string[];
  selectedItems: any[];
  anyLocked: boolean;

  // commands
  duplicate: () => void;
  toggleLock: () => void;
  deleteSelected: () => void;

  // layers
  bringForward: () => void;
  sendBackward: () => void;
  bringToFront: () => void;
  sendToBack: () => void;

  // snapping wrapper for canvas commits
  updateItemSnapped: (id: string, patch: Partial<StudioItem>) => void;
};

const CanvasShellContext = createContext<Ctx | null>(null);

export function useCanvasShell() {
  const ctx = useContext(CanvasShellContext);
  if (!ctx) throw new Error("useCanvasShell must be used within CanvasShellProvider");
  return ctx;
}

export function CanvasShellProvider(props: {
  store: any;
  doc: LayoutDoc;
  children: React.ReactNode;
}) {
  const { store, doc } = props;

  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(false);

  const snapStep = 20;

  const [cursorWorld, setCursorWorldState] = useState<{ x: number; y: number } | null>(null);

  const setCursorWorld = useCallback(
    (p: { x: number; y: number } | null) => {
      setCursorWorldState(p);
      store.setCursorWorld?.(p);
    },
    [store]
  );

  const selectedIds: string[] = store.selectedIds ?? [];
  const selectedItems: any[] = store.selectedItems ?? [];
  const anyLocked = selectedItems.some((it: any) => Boolean(it?.meta?.locked));

  const duplicate = useCallback(() => {
    store.copySelected?.();
    store.pasteAtCursor?.();
  }, [store]);

  const deleteSelected = useCallback(() => {
    store.deleteSelected?.();
  }, [store]);

  const toggleLock = useCallback(() => {
    if (!selectedItems.length) return;
    const nextLocked = !anyLocked;
    selectedItems.forEach((it: any) => {
      store.updateItem?.(it.id, { meta: { ...it.meta, locked: nextLocked } });
    });
  }, [store, selectedItems, anyLocked]);

  // order helpers
  const bringForward = useCallback(() => {
    if (!selectedItems.length) return;
    selectedItems.forEach((it: any) =>
      store.updateItem?.(it.id, { order: (it.order ?? 0) + 1 })
    );
  }, [store, selectedItems]);

  const sendBackward = useCallback(() => {
    if (!selectedItems.length) return;
    selectedItems.forEach((it: any) =>
      store.updateItem?.(it.id, { order: (it.order ?? 0) - 1 })
    );
  }, [store, selectedItems]);

  const bringToFront = useCallback(() => {
    if (!selectedItems.length) return;
    const maxOrder = (doc.items ?? []).reduce(
      (m: number, it: any) => Math.max(m, it.order ?? 0),
      0
    );
    const sorted = [...selectedItems].sort(
      (a: any, b: any) => (a.order ?? 0) - (b.order ?? 0)
    );
    sorted.forEach((it: any, idx: number) =>
      store.updateItem?.(it.id, { order: maxOrder + 1 + idx })
    );
  }, [store, selectedItems, doc.items]);

  const sendToBack = useCallback(() => {
    if (!selectedItems.length) return;
    const minOrder = (doc.items ?? []).reduce(
      (m: number, it: any) => Math.min(m, it.order ?? 0),
      0
    );
    const sorted = [...selectedItems].sort(
      (a: any, b: any) => (a.order ?? 0) - (b.order ?? 0)
    );
    sorted.forEach((it: any, idx: number) =>
      store.updateItem?.(it.id, { order: minOrder - sorted.length + idx })
    );
  }, [store, selectedItems, doc.items]);

  const updateItemSnapped = useCallback(
    (id: string, patch: Partial<StudioItem>) => {
      if (!snapToGrid) return store.updateItem?.(id, patch);

      const round = (v: number) => Math.round(v / snapStep) * snapStep;
      const next: any = { ...patch };

      if (typeof next.x === "number") next.x = round(next.x);
      if (typeof next.y === "number") next.y = round(next.y);
      if (typeof next.w === "number") next.w = Math.max(1, round(next.w));
      if (typeof next.h === "number") next.h = Math.max(1, round(next.h));

      store.updateItem?.(id, next);
    },
    [store, snapToGrid]
  );

  const value = useMemo<Ctx>(
    () => ({
      showGrid,
      setShowGrid,
      snapToGrid,
      setSnapToGrid,
      snapStep,
      cursorWorld,
      setCursorWorld,
      selectedIds,
      selectedItems,
      anyLocked,
      duplicate,
      toggleLock,
      deleteSelected,
      bringForward,
      sendBackward,
      bringToFront,
      sendToBack,
      updateItemSnapped,
    }),
    [
      showGrid,
      snapToGrid,
      cursorWorld,
      setCursorWorld,
      selectedIds,
      selectedItems,
      anyLocked,
      duplicate,
      toggleLock,
      deleteSelected,
      bringForward,
      sendBackward,
      bringToFront,
      sendToBack,
      updateItemSnapped,
    ]
  );

  return <CanvasShellContext.Provider value={value}>{props.children}</CanvasShellContext.Provider>;
}