// apps/studio/app/studio/editor-core/canvas/item/overlays/BezierEditorOverlay.tsx
"use client";

import React, { useEffect, useState } from "react";
import { Circle, Group, Line } from "react-konva";
import type { BezierHandle, BezierPath, BezierPoint } from "../../../types";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function bezierToLocal(point: { x: number; y: number }, w: number, h: number) {
  return { x: point.x * w, y: point.y * h };
}
function localToBezier(point: { x: number; y: number }, w: number, h: number) {
  return { x: clamp(point.x / w, 0, 1), y: clamp(point.y / h, 0, 1) };
}

export default function BezierEditorOverlay(props: {
  w: number;
  h: number;
  path: BezierPath;
  onChange: (next: BezierPath) => void;
}) {
  const pts = props.path.points;
  const [activeIndex, setActiveIndex] = useState<number>(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [props.path.points.length]);

  function setPoint(i: number, patch: Partial<BezierPoint>) {
    const next = pts.map((p, idx) => (idx === i ? { ...p, ...patch } : p));
    props.onChange({ ...props.path, points: next });
  }

  function setHandle(i: number, which: "in" | "out", value: BezierHandle | undefined) {
    setPoint(i, { [which]: value } as any);
  }

  const active = pts[activeIndex];
  if (!active) return null;

  const P = bezierToLocal({ x: active.x, y: active.y }, props.w, props.h);
  const Hin = active.in ? bezierToLocal(active.in, props.w, props.h) : null;
  const Hout = active.out ? bezierToLocal(active.out, props.w, props.h) : null;

  return (
    <Group listening>
      {Hin ? (
        <Line points={[P.x, P.y, Hin.x, Hin.y]} stroke="rgba(255,255,255,0.55)" strokeWidth={1} listening={false} />
      ) : null}
      {Hout ? (
        <Line
          points={[P.x, P.y, Hout.x, Hout.y]}
          stroke="rgba(255,255,255,0.55)"
          strokeWidth={1}
          listening={false}
        />
      ) : null}

      {Hin ? (
        <Circle
          x={Hin.x}
          y={Hin.y}
          radius={5}
          fill="rgba(255,255,255,0.95)"
          stroke="rgba(255, 90, 90, 0.9)"
          strokeWidth={1.4}
          draggable
          onDragMove={(e) => {
            const local = { x: e.target.x(), y: e.target.y() };
            const next = localToBezier(local, props.w, props.h);
            setHandle(activeIndex, "in", next);
          }}
        />
      ) : null}

      {Hout ? (
        <Circle
          x={Hout.x}
          y={Hout.y}
          radius={5}
          fill="rgba(255,255,255,0.95)"
          stroke="rgba(255, 90, 90, 0.9)"
          strokeWidth={1.4}
          draggable
          onDragMove={(e) => {
            const local = { x: e.target.x(), y: e.target.y() };
            const next = localToBezier(local, props.w, props.h);
            setHandle(activeIndex, "out", next);
          }}
        />
      ) : null}

      {pts.map((p, i) => {
        const A = bezierToLocal({ x: p.x, y: p.y }, props.w, props.h);
        const isActive = i === activeIndex;

        return (
          <Circle
            key={`${p.id}-anchor`}
            x={A.x}
            y={A.y}
            radius={isActive ? 6.5 : 6}
            fill="rgba(255,255,255,0.98)"
            stroke="rgba(255, 90, 90, 0.95)"
            strokeWidth={isActive ? 2.0 : 1.6}
            shadowColor="rgba(0,0,0,0.18)"
            shadowBlur={10}
            shadowOffsetX={0}
            shadowOffsetY={6}
            draggable
            onClick={() => setActiveIndex(i)}
            onTap={() => setActiveIndex(i)}
            onDragMove={(e) => {
              const local = { x: e.target.x(), y: e.target.y() };
              const next = localToBezier(local, props.w, props.h);
              setPoint(i, { x: next.x, y: next.y });
            }}
            onDblClick={() => {
              const has = Boolean(p.in || p.out);
              if (has) {
                setPoint(i, { in: undefined, out: undefined });
              } else {
                const left: BezierHandle = { x: clamp(p.x - 0.08, 0, 1), y: p.y };
                const right: BezierHandle = { x: clamp(p.x + 0.08, 0, 1), y: p.y };
                setPoint(i, { in: left, out: right });
              }
            }}
          />
        );
      })}
    </Group>
  );
}
