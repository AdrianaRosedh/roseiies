"use client";

import React, { useMemo } from "react";
import { Stage, Layer, Rect, Circle } from "react-konva";
import type Konva from "konva";

import type { Item } from "../types";
import ItemNode from "./ItemNode";
import type { MapFeature } from "@/lib/features/types";

function kindColor(kind: string) {
  const k = String(kind ?? "").toLowerCase();
  if (k === "planting") return "rgba(94, 118, 88, 0.95)";
  if (k === "note") return "rgba(251,113,133,0.95)";
  if (k === "sensor") return "rgba(245,158,11,0.95)";
  if (k === "irrigation") return "rgba(94,118,88,0.95)";
  if (k === "event") return "rgba(168,85,247,0.95)";
  return "rgba(148,163,184,0.95)";
}

// Garden palette
const SOIL = "#e6e2dc"; 

export default function GardenMap(props: {
  stageRefSetter: (s: Konva.Stage | null) => void;
  viewport: { width: number; height: number };
  vp: { x: number; y: number; scale: number };
  canvas: { width: number; height: number };

  items: Item[];
  featuresByBed: Map<string, MapFeature[]>; // canvasBedId -> features

  selectedBedId: string | null;

  onSelectBed: (id: string) => void;
  onSelectFeature: (bedId: string, featureId: string) => void;
  onTapBackground: () => void;

  onWheel: (e: any) => void;
  onDragEnd: (pos: { x: number; y: number }) => void;
}) {
  const items = useMemo(() => {
    const xs = props.items ?? [];
    return [...xs].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [props.items]);

  // Big world rectangle so panning never shows “nothing”
  const world = useMemo(() => {
    const pad = 1200;
    return {
      x: -pad,
      y: -pad,
      w: props.canvas.width + pad * 2,
      h: props.canvas.height + pad * 2,
    };
  }, [props.canvas.width, props.canvas.height]);

  return (
    <Stage
      width={props.viewport.width}
      height={props.viewport.height}
      draggable
      pixelRatio={1}
      perfectDrawEnabled={false}
      ref={(n) => props.stageRefSetter(n)}
      x={props.vp.x}
      y={props.vp.y}
      scaleX={props.vp.scale}
      scaleY={props.vp.scale}
      onWheel={props.onWheel}
      onDragEnd={(e) => props.onDragEnd({ x: e.target.x(), y: e.target.y() })}
      onMouseDown={(e) => {
        const clickedOnEmpty = e.target === e.target.getStage();
        if (clickedOnEmpty) props.onTapBackground();
      }}
      onTouchStart={(e) => {
        const stage = (e.target as any).getStage?.();
        const clickedOnEmpty = stage && e.target === stage;
        if (clickedOnEmpty) props.onTapBackground();
      }}
    >
      <Layer>
        {/* Soil world */}
        <Rect
          x={world.x}
          y={world.y}
          width={world.w}
          height={world.h}
          fill={SOIL}
          listening={false}
        />

        {/* Garden plot (canvas) */}
        <Rect
          x={0}
          y={0}
          width={props.canvas.width}
          height={props.canvas.height}
          cornerRadius={26}
          fillLinearGradientStartPoint={{ x: 0, y: 0 }}
          fillLinearGradientEndPoint={{ x: props.canvas.width, y: props.canvas.height }}
          fill={SOIL}
          strokeWidth={2}
          listening={false}
        />

        {/* Items (beds/trees/structures) */}
        {items.map((it) => (
          <ItemNode
            key={it.id}
            item={it}
            selected={props.selectedBedId === it.id}
            onSelect={() => props.onSelectBed(it.id)} // ✅ tree clicks work too
          />
        ))}

        {/* Feature pins (still only on beds; ok) */}
        {items.map((it) => {
          if (String(it.type ?? "").toLowerCase() !== "bed") return null;

          const feats = props.featuresByBed.get(it.id) ?? [];
          if (feats.length === 0) return null;

          const w = Number(it.w ?? 120);
          const h = Number(it.h ?? 80);

          const cx = Number(it.x ?? 0) + w / 2;
          const cy = Number(it.y ?? 0) + h / 2;

          return feats.slice(0, 4).map((f, idx) => {
            const fill = kindColor(f.kind);
            const dx = idx * 10;
            const dy = idx * -10;

            return (
              <Circle
                key={`${it.id}:${f.id}`}
                x={cx + dx}
                y={cy + dy}
                radius={7}
                fill={fill}
                strokeWidth={2}
                onClick={() => props.onSelectFeature(it.id, f.id)}
                onTap={() => props.onSelectFeature(it.id, f.id)}
              />
            );
          });
        })}
      </Layer>
    </Stage>
  );
}
