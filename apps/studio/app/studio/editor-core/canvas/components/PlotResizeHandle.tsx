// apps/studio/app/studio/editor-core/canvas/components/PlotResizeHandle.tsx
"use client";

import { Circle, Group } from "react-konva";

export default function PlotResizeHandle(props: {
  plotW: number;
  plotH: number;
  minW: number;
  minH: number;

  setWrapCursor: (c: string) => void;
  setDraftCanvas: (v: { w: number; h: number } | null) => void;
  commitCanvasSize: (next: { w: number; h: number }) => void;
}) {
  const { plotW, plotH, minW, minH } = props;

  return (
    <Group>
      <Circle
        x={plotW}
        y={plotH}
        radius={18}
        fill="rgba(0,0,0,0.001)"
        draggable
        onDragStart={(e) => {
          (e as any).cancelBubble = true;
          props.setWrapCursor("nwse-resize");
        }}
        onMouseEnter={() => props.setWrapCursor("nwse-resize")}
        onMouseLeave={() => props.setWrapCursor("default")}
        dragBoundFunc={(pos) => {
          const w = Math.max(minW, pos.x);
          const h = Math.max(minH, pos.y);
          return { x: w, y: h };
        }}
        onDragMove={(e) => {
          (e as any).cancelBubble = true;
          const w = Math.max(minW, e.target.x());
          const h = Math.max(minH, e.target.y());
          props.setDraftCanvas({ w, h });
        }}
        onDragEnd={(e) => {
          (e as any).cancelBubble = true;
          const w = Math.max(minW, e.target.x());
          const h = Math.max(minH, e.target.y());
          props.commitCanvasSize({ w, h });
          props.setWrapCursor("default");
        }}
      />

      <Circle
        x={plotW}
        y={plotH}
        radius={7}
        fill="rgba(255,255,255,0.98)"
        stroke="rgba(111, 102, 255, 0.70)"
        strokeWidth={1.2}
        shadowColor="rgba(111, 102, 255, 0.22)"
        shadowBlur={10}
        shadowOffsetX={0}
        shadowOffsetY={6}
        listening={false}
      />
    </Group>
  );
}
