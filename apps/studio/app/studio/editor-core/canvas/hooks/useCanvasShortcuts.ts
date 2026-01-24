"use client";

import { useEffect, useRef } from "react";

function isEditableTarget(t: EventTarget | null) {
  const el = t as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName?.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  if ((el as any).isContentEditable) return true;
  return false;
}

function keyIs(e: KeyboardEvent, k: string) {
  return e.key.toLowerCase() === k.toLowerCase();
}

export function useCanvasShortcuts(args: {
  enabled?: boolean;

  // camera actions
  zoomTo100: () => void;
  fitPlotToViewport: (paddingPx?: number) => void;
  zoomToSelection: (
    selectedItems: Array<{ x: number; y: number; w: number; h: number; r?: number }>,
    paddingPx?: number
  ) => void;
  selectedItems: Array<{ x: number; y: number; w: number; h: number; r?: number }>;

  // history
  undo?: () => void;
  redo?: () => void;

  // editor actions
  copy?: () => void;
  paste?: () => void;
  duplicate?: () => void;
  delete?: () => void;

  selectAll?: () => void;

  clearSelection?: () => void;
  exitPlaceMode?: () => void;
  exitEditMode?: () => void;

  // tweakables
  fitPaddingPx?: number;
  selectionPaddingPx?: number;
}) {
  const enabled = args.enabled ?? true;

  const ref = useRef(args);
  ref.current = args;

  useEffect(() => {
    if (!enabled) return;
    
    const opts = { passive: false, capture: true } as const;
    
    function onKeyDown(e: KeyboardEvent) {
      const a = ref.current;
    
      if (isEditableTarget(e.target)) return;
    
      const mod = e.metaKey || e.ctrlKey;
    
      // Handle ONLY the keys we care about, and when we do:
      // - preventDefault()
      // - stopImmediatePropagation()  ✅ blocks other window listeners
      // - return
      //
      // This guarantees single fire even if other listeners exist.
    
      // Cmd/Ctrl+V
      if (mod && keyIs(e, "v")) {
        if (!a.paste) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        a.paste();
        return;
      }
    
      // Cmd/Ctrl+C
      if (mod && keyIs(e, "c")) {
        if (!a.copy) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        a.copy();
        return;
      }
    
      // Cmd/Ctrl+D (duplicate)
      if (mod && keyIs(e, "d")) {
        if (!a.duplicate) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        a.duplicate();
        return;
      }
    
      // Undo / Redo
      if (mod && keyIs(e, "z")) {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (e.shiftKey) a.redo?.();
        else a.undo?.();
        return;
      }
      if (mod && keyIs(e, "y")) {
        e.preventDefault();
        e.stopImmediatePropagation();
        a.redo?.();
        return;
      }
    
      // Camera keys
      if (mod && e.key === "0") {
        e.preventDefault();
        e.stopImmediatePropagation();
        a.zoomTo100();
        return;
      }
      if (mod && e.key === "1") {
        e.preventDefault();
        e.stopImmediatePropagation();
        a.fitPlotToViewport(a.fitPaddingPx ?? 110);
        return;
      }
      if (mod && e.key === "2") {
        e.preventDefault();
        e.stopImmediatePropagation();
        a.zoomToSelection(a.selectedItems, a.selectionPaddingPx ?? 120);
        return;
      }
    
      // Escape
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopImmediatePropagation();
        a.exitPlaceMode?.();
        a.exitEditMode?.();
        a.clearSelection?.();
        return;
      }
    
      // Delete
      if (e.key === "Backspace" || e.key === "Delete") {
        if (!a.delete) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        a.delete();
        return;
      }
    
      // Select all
      if (mod && keyIs(e, "a")) {
        if (!a.selectAll) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        a.selectAll();
        return;
      }
    }
  
    window.addEventListener("keydown", onKeyDown, opts);
    return () => window.removeEventListener("keydown", onKeyDown, opts);
  }, [enabled]);
}
