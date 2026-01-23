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

  return (
    <>
      <Rect
        x={view.x}
        y={view.y}
        width={view.w}
        height={view.h}
        fill="rgba(238,233,225,1)"
        listening={false}
        perfectDrawEnabled={false}
      />

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
          "rgba(255,255,255,0.10)",
          1,
          "rgba(0,0,0,0.06)",
        ]}
        opacity={0.55}
        listening={false}
        perfectDrawEnabled={false}
      />

      {props.noiseImg ? (
        <Rect
          x={view.x}
          y={view.y}
          width={view.w}
          height={view.h}
          fillPatternImage={props.noiseImg}
          fillPatternRepeat="repeat"
          fillPatternOffset={props.noiseOffset}
          opacity={0.045}
          listening={false}
          perfectDrawEnabled={false}
        />
      ) : null}
    </>
  );
}
