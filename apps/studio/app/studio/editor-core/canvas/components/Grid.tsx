// apps/studio/app/studio/editor-core/canvas/components/Grid.tsx
"use client";

import React, { useMemo } from "react";
import { Rect } from "react-konva";
import { clamp } from "../utils/math";

export default function Grid(props: {
  plotW: number;
  plotH: number;
  stageScale: number;
}) {
  const gridStep = 80;

  // fade in grid as you zoom in (same behavior as before, but cheaper)
  const showGrid = props.stageScale >= 0.55;
  const gridAlpha = clamp((props.stageScale - 0.55) / 0.9, 0, 1);
  const lineAlpha = 0.03 + 0.06 * gridAlpha;

  // one small tile repeated across the plot (instead of hundreds of <Line /> nodes)
  const tile = useMemo(() => {
    if (typeof document === "undefined") return null;

    const c = document.createElement("canvas");
    c.width = gridStep;
    c.height = gridStep;

    const ctx = c.getContext("2d");
    if (!ctx) return null;

    ctx.clearRect(0, 0, gridStep, gridStep);
    ctx.strokeStyle = `rgba(94, 118, 88, ${lineAlpha})`;
    ctx.lineWidth = 1;

    // draw 1 vertical + 1 horizontal line at the tile edges
    // (0.5 for crisp 1px stroke on the pixel grid)
    ctx.beginPath();
    ctx.moveTo(0.5, 0);
    ctx.lineTo(0.5, gridStep);
    ctx.moveTo(0, 0.5);
    ctx.lineTo(gridStep, 0.5);
    ctx.stroke();

    return c;
  }, [gridStep, lineAlpha]);

  if (!showGrid || !tile) return null;

  return (
    <Rect
      x={0}
      y={0}
      width={props.plotW}
      height={props.plotH}
      fillPatternImage={tile as any}
      fillPatternRepeat="repeat"
      listening={false}
      perfectDrawEnabled={false}
    />
  );
}
