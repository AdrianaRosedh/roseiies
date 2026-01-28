// apps/studio/app/studio/editor-core/canvas/components/CanvasOverlays.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type ScreenBox = { left: number; top: number; width: number; height: number } | null;

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function niceToolLabel(tool: string, panMode: boolean, placeMode?: { tool: string } | null) {
  if (panMode) return "Pan";
  if (placeMode?.tool === "tree") return "Placing tree";
  const t = String(tool ?? "select");
  if (t === "select") return "Select";
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export default function CanvasOverlays(props: {
  tool: string;
  panMode: boolean;
  placeMode?: { tool: string } | null;

  stageScale: number;

  selectionBox: ScreenBox;

  selectedCount: number;
  selectedLabel?: string | null;
  selectedType?: string | null;

  itemsCount?: number;

  // ✅ new: prevent double popups
  showSelectionCard?: boolean;
}) {
  const [showZoom, setShowZoom] = useState(false);

  useEffect(() => {
    setShowZoom(true);
    const id = window.setTimeout(() => setShowZoom(false), 1200);
    return () => window.clearTimeout(id);
  }, [props.stageScale]);

  const zoomPct = useMemo(() => {
    const z = Math.round((props.stageScale || 1) * 100);
    return `${z}%`;
  }, [props.stageScale]);

  const cardPos = useMemo(() => {
    const b = props.selectionBox;
    if (!b) return null;

    const x = Math.max(12, Math.min(window.innerWidth - 260, b.left + b.width / 2 - 120));
    const y = Math.max(12, b.top - 54);
    return { x, y };
  }, [props.selectionBox]);

  const toolLabel = niceToolLabel(props.tool, props.panMode, props.placeMode);
  const allowSelectionCard = props.showSelectionCard !== false;

  return (
    <>
      {/* Tool pill */}
      <motion.div
        initial={{ opacity: 0, y: -6, filter: "blur(6px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ type: "spring", stiffness: 520, damping: 38 }}
        className="absolute left-4 top-4 z-20"
      >
        <div className="rounded-full border border-black/10 bg-white/70 px-3 py-2 text-xs text-black/70 shadow-sm backdrop-blur">
          <span className="font-semibold text-black/70">{toolLabel}</span>
          {typeof props.itemsCount === "number" ? <span className="text-black/35"> · {props.itemsCount} items</span> : null}
          {props.selectedCount > 0 ? <span className="text-black/35"> · {props.selectedCount} selected</span> : null}
        </div>
      </motion.div>

      {/* Zoom pill */}
      <AnimatePresence>
        {showZoom ? (
          <motion.div
            key="zoom-pill"
            initial={{ opacity: 0, y: -6, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -6, filter: "blur(6px)" }}
            transition={{ type: "spring", stiffness: 520, damping: 38 }}
            className="absolute right-4 top-4 z-20"
          >
            <div className="rounded-full border border-black/10 bg-white/70 px-3 py-2 text-xs text-black/70 shadow-sm backdrop-blur">
              Zoom <span className="font-semibold">{zoomPct}</span>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Selection card (disabled when FloatingToolbar is present) */}
      <AnimatePresence>
        {allowSelectionCard && cardPos && props.selectedCount > 0 ? (
          <motion.div
            key={`sel-card:${props.selectedLabel ?? props.selectedType ?? props.selectedCount}`}
            layoutId="canvas-selection-card"
            initial={{ opacity: 0, y: 8, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 8, filter: "blur(8px)" }}
            transition={{ type: "spring", stiffness: 520, damping: 38 }}
            style={{ left: cardPos.x, top: cardPos.y }}
            className={cn(
              "absolute z-30 w-60 pointer-events-none",
              "rounded-2xl border border-black/10 bg-white/80 shadow-sm backdrop-blur"
            )}
          >
            <div className="px-3 py-2">
              <div className="text-xs font-semibold text-black/80 truncate">
                {props.selectedLabel ? props.selectedLabel : props.selectedCount > 1 ? "Multiple selected" : "Selected"}
              </div>
              <div className="mt-0.5 text-[11px] text-black/45 truncate">
                {props.selectedType ? props.selectedType : props.selectedCount > 1 ? "Group" : "Object"}
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
