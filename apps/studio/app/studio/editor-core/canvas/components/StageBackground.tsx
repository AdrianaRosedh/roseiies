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
      <Rect
        x={-INF}
        y={-INF}
        width={INF * 2}
        height={INF * 2}
        fill="rgba(248,246,240,1)"
        listening={false}
      />

      {props.noiseImg ? (
        <Rect
          x={-INF}
          y={-INF}
          width={INF * 2}
          height={INF * 2}
          fillPatternImage={props.noiseImg}
          fillPatternRepeat="repeat"
          fillPatternOffset={props.noiseOffset}
          opacity={0.035}
          listening={false}
        />
      ) : null}
    </>
  );
}
