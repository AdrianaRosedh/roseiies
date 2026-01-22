// apps/studio/app/studio/editor-core/canvas/item/shapes/CurvatureShape.tsx
"use client";

import React from "react";
import { Shape } from "react-konva";
import type { StudioItem, CurvaturePath } from "../../../types";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function catmullRomToBezierSegments(
  pts: { x: number; y: number; corner?: boolean }[],
  closed: boolean,
  tension: number
) {
  const n = pts.length;
  if (n < 2) return [];

  const get = (i: number) => {
    if (closed) return pts[(i + n) % n];
    return pts[Math.max(0, Math.min(n - 1, i))];
  };

  const t = clamp(tension, 0, 2);
  const k = t / 6;

  const segs: { p1: any; c1: any; c2: any; p2: any }[] = [];
  const last = closed ? n : n - 1;

  for (let i = 0; i < last; i++) {
    const P0 = get(i - 1);
    const P1 = get(i);
    const P2 = get(i + 1);
    const P3 = get(i + 2);

    let C1 = { x: P1.x + (P2.x - P0.x) * k, y: P1.y + (P2.y - P0.y) * k };
    let C2 = { x: P2.x - (P3.x - P1.x) * k, y: P2.y - (P3.y - P1.y) * k };

    if (P1.corner) C1 = { x: P1.x, y: P1.y };
    if (P2.corner) C2 = { x: P2.x, y: P2.y };

    segs.push({ p1: P1, c1: C1, c2: C2, p2: P2 });
  }

  return segs;
}

export default function CurvatureShape(props: {
  item: StudioItem;
  path: CurvaturePath;
  fill: string;
  stroke: string;
  strokeWidth: number;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
}) {
  const curv = props.path;
  const w = props.item.w;
  const h = props.item.h;

  return (
    <Shape
      sceneFunc={(ctx, shape) => {
        const pts = curv.points;
        if (!pts?.length) {
          ctx.beginPath();
          ctx.rect(0, 0, w, h);
          ctx.closePath();
          ctx.fillStrokeShape(shape);
          return;
        }

        const localPts = pts.map((p) => ({ x: p.x * w, y: p.y * h, corner: p.corner }));
        const segs = catmullRomToBezierSegments(localPts, curv.closed, curv.tension ?? 1);
        if (!segs.length) return;

        ctx.beginPath();
        ctx.moveTo(segs[0].p1.x, segs[0].p1.y);
        for (const s of segs) ctx.bezierCurveTo(s.c1.x, s.c1.y, s.c2.x, s.c2.y, s.p2.x, s.p2.y);
        if (curv.closed) ctx.closePath();
        ctx.fillStrokeShape(shape);
      }}
      fill={props.fill}
      stroke={props.stroke}
      strokeWidth={props.strokeWidth}
      shadowColor={props.shadowColor}
      shadowBlur={props.shadowBlur}
      shadowOffsetX={props.shadowOffsetX}
      shadowOffsetY={props.shadowOffsetY}
      shadowEnabled
    />
  );
}
