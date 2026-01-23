// apps/studio/app/studio/editor-core/canvas/components/StageBackground.tsx
"use client";

import { Rect } from "react-konva";

export default function StageBackground(props: {
  plotW: number;
  plotH: number;
  noiseImg: HTMLImageElement | null;
  noiseOffset: { x: number; y: number };
}) {
  const INF = Math.max(props.plotW, props.plotH) * 40;

  return (
    <>
      {/* Infinite "desk paper" (slightly darker than the plot so the plot reads as a surface) */}
      <Rect
        x={-INF}
        y={-INF}
        width={INF * 2}
        height={INF * 2}
        fill="rgba(238,233,225,1)" // darker than plot surface
        listening={false}
      />

      {/* Gentle vignette so it feels infinite / ambient */}
      <Rect
        x={-INF}
        y={-INF}
        width={INF * 2}
        height={INF * 2}
        fillRadialGradientStartPoint={{ x: 0, y: 0 }}
        fillRadialGradientEndPoint={{ x: 0, y: 0 }}
        fillRadialGradientStartRadius={INF * 0.15}
        fillRadialGradientEndRadius={INF * 1.15}
        fillRadialGradientColorStops={[
          0,
          "rgba(255,255,255,0.10)",
          1,
          "rgba(0,0,0,0.06)",
        ]}
        opacity={0.55}
        listening={false}
      />

      {/* Subtle moving grain */}
      {props.noiseImg ? (
        <Rect
          x={-INF}
          y={-INF}
          width={INF * 2}
          height={INF * 2}
          fillPatternImage={props.noiseImg}
          fillPatternRepeat="repeat"
          fillPatternOffset={props.noiseOffset}
          opacity={0.045}
          listening={false}
        />
      ) : null}
    </>
  );
}
