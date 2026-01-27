// apps/studio/app/studio/editor-core/canvas/components/StageBackground.tsx
"use client";

import React, { useMemo } from "react";
import { Rect } from "react-konva";

export default function StageBackground(props: {
  plotW: number;
  plotH: number;

  noiseImg: HTMLImageElement | null;
  noiseOffset: { x: number; y: number };

  stagePos?: { x: number; y: number };
  stageScale?: number;
  stageSize?: { w: number; h: number };
}) {
  // ✅ defensive defaults (prevents boot-time undefined crashes)
  const stagePos = props.stagePos ?? { x: 0, y: 0 };
  const stageScale = props.stageScale ?? 1;
  const stageSize = props.stageSize ?? { w: props.plotW, h: props.plotH };

  const view = useMemo(() => {
    const s = Math.max(1e-6, stageScale);
    const vw = stageSize.w / s;
    const vh = stageSize.h / s;

    const left = -stagePos.x / s;
    const top = -stagePos.y / s;

    // big pad so background always fills viewport even when panning
    const pad = Math.max(vw, vh) * 0.8;

    return {
      x: left - pad,
      y: top - pad,
      w: vw + pad * 2,
      h: vh + pad * 2,
      cx: left + vw * 0.5,
      cy: top + vh * 0.5,
      r0: Math.max(vw, vh) * 0.12,
      r1: Math.max(vw, vh) * 1.15,
    };
  }, [stagePos.x, stagePos.y, stageScale, stageSize.w, stageSize.h]);

  // Match AppShell background (Sheets blank space):
  // AppShell uses bg-[#fbfbfb] :contentReference[oaicite:2]{index=2}
  const BASE = "rgba(251,251,251,1)"; // #fbfbfb

  return (
    <>
      {/* Base */}
      <Rect
        x={view.x}
        y={view.y}
        width={view.w}
        height={view.h}
        fill={BASE}
        listening={false}
        perfectDrawEnabled={false}
      />

      {/* Very subtle vignette (kept cool/neutral so it doesn't warm the page) */}
      <Rect
        x={view.x}
        y={view.y}
        width={view.w}
        height={view.h}
        fillRadialGradientStartPoint={{ x: view.cx, y: view.cy }}
        fillRadialGradientEndPoint={{ x: view.cx, y: view.cy }}
        fillRadialGradientStartRadius={view.r0}
        fillRadialGradientEndRadius={view.r1}
        fillRadialGradientColorStops={[
          0,
          "rgba(255,255,255,0.08)",
          1,
          "rgba(0,0,0,0.045)",
        ]}
        opacity={0.42}
        listening={false}
        perfectDrawEnabled={false}
      />

      {/* Optional noise (kept extremely low to avoid tinting) */}
      {props.noiseImg ? (
        <Rect
          x={view.x}
          y={view.y}
          width={view.w}
          height={view.h}
          fillPatternImage={props.noiseImg}
          fillPatternRepeat="repeat"
          fillPatternOffset={props.noiseOffset}
          opacity={0.03}
          listening={false}
          perfectDrawEnabled={false}
        />
      ) : null}
    </>
  );
}
