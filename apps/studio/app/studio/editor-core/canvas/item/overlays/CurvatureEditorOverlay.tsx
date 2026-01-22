"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Circle, Group } from "react-konva";
import type { CurvaturePath, CurvaturePoint } from "../../../types";

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

/* ---------------- Curvature Editor Overlay ---------------- */

export default function CurvatureEditorOverlay(props: {
  w: number;
  h: number;
  path: CurvaturePath;
  onDraft: (next: CurvaturePath) => void;
  onCommit: (next: CurvaturePath) => void;
}) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [props.path.points.length]);

  const setDraftRaf = useRafThrottled(props.onDraft);

  function setPoint(i: number, patch: Partial<CurvaturePoint>) {
    const pts = props.path.points.map((p, idx) => (idx === i ? { ...p, ...patch } : p));
    setDraftRaf({ ...props.path, points: pts });
  }

  // commit on drag end (store write once)
  function commitNow(next: CurvaturePath) {
    props.onCommit(next);
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
            stroke={p.corner ? "rgba(15,23,42,0.90)" : "rgba(255, 90, 90, 0.95)"}
            strokeWidth={isActive ? 2.0 : 1.6}
            shadowColor="rgba(0,0,0,0.18)"
            shadowBlur={10}
            shadowOffsetX={0}
            shadowOffsetY={6}
            draggable
            onClick={(e) => {
              const shift = Boolean(e.evt?.shiftKey);
              if (shift) {
                const next = { ...props.path };
                const pts = next.points.map((pp, idx) => (idx === i ? { ...pp, corner: !pp.corner } : pp));
                commitNow({ ...next, points: pts });
                return;
              }
              setActiveIndex(i);
            }}
            onTap={() => setActiveIndex(i)}
            onDragMove={(e) => {
              const local = { x: e.target.x(), y: e.target.y() };
              const nx = clamp(local.x / props.w, 0, 1);
              const ny = clamp(local.y / props.h, 0, 1);
              setPoint(i, { x: nx, y: ny });
            }}
            onDragEnd={() => {
              // commit latest path (best-effort; onDraft is rAF throttled)
              commitNow(props.path);
            }}
          />
        );
      })}
    </Group>
  );
}
