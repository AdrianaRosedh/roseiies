"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Circle, Group } from "react-konva";
import type { PolygonPath, PolygonPoint } from "../../../types";

/* ---------------- Utils ---------------- */

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/* ---------------- rAF throttle (local) ---------------- */

function useRafThrottled<T extends (...args: any[]) => void>(fn: T) {
  const raf = useRef<number | null>(null);
  const lastArgs = useRef<any[] | null>(null);
  const fnRef = useRef(fn);

  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  return useCallback((...args: Parameters<T>) => {
    lastArgs.current = args;
    if (raf.current != null) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = null;
      if (lastArgs.current) fnRef.current(...(lastArgs.current as any[]));
    });
  }, []) as T;
}

/* ---------------- Polygon Editor Overlay ---------------- */

export default function PolygonEditorOverlay(props: {
  w: number;
  h: number;
  path: PolygonPath;
  onDraft: (next: PolygonPath) => void;
  onCommit: (next: PolygonPath) => void;
}) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [props.path.points.length]);

  const setDraftRaf = useRafThrottled(props.onDraft);

  function setPoint(i: number, patch: Partial<PolygonPoint>) {
    const pts = props.path.points.map((p, idx) => (idx === i ? { ...p, ...patch } : p));
    setDraftRaf({ ...props.path, points: pts });
  }

  return (
    <Group listening>
      {props.path.points.map((p, i) => {
        const x = p.x * props.w;
        const y = p.y * props.h;
        const isActive = i === activeIndex;

        return (
          <Circle
            key={p.id}
            x={x}
            y={y}
            radius={isActive ? 6.5 : 6}
            fill="rgba(255,255,255,0.98)"
            stroke="rgba(111, 102, 255, 0.85)"
            strokeWidth={isActive ? 2.0 : 1.6}
            shadowColor="rgba(0,0,0,0.14)"
            shadowBlur={10}
            shadowOffsetX={0}
            shadowOffsetY={6}
            draggable
            onClick={() => setActiveIndex(i)}
            onTap={() => setActiveIndex(i)}
            onDragMove={(e) => {
              const local = { x: e.target.x(), y: e.target.y() };
              const nx = clamp(local.x / props.w, 0, 1);
              const ny = clamp(local.y / props.h, 0, 1);
              setPoint(i, { x: nx, y: ny });
            }}
            onDragEnd={() => {
              props.onCommit(props.path);
            }}
          />
        );
      })}
    </Group>
  );
}
