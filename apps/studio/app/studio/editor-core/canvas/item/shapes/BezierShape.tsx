// apps/studio/app/studio/editor-core/canvas/item/shapes/BezierShape.tsx
"use client";

import React from "react";
import { Shape } from "react-konva";
import type { StudioItem, BezierPath } from "../../../types";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function bezierToLocal(point: { x: number; y: number }, w: number, h: number) {
  return { x: point.x * w, y: point.y * h };
}

export default function BezierShape(props: {
  item: StudioItem;
  fill: string;
  stroke: string;
  strokeWidth: number;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
}) {
  const bezier = props.item.meta.bezier as BezierPath;
  const w = props.item.w;
  const h = props.item.h;

  return (
    <Shape
      sceneFunc={(ctx, shape) => {
        const pts = bezier?.points ?? [];
        if (!pts.length) {
          ctx.beginPath();
          ctx.rect(0, 0, w, h);
          ctx.closePath();
          ctx.fillStrokeShape(shape);
          return;
        }

        const firstLocal = bezierToLocal({ x: pts[0].x, y: pts[0].y }, w, h);
        ctx.beginPath();
        ctx.moveTo(firstLocal.x, firstLocal.y);

        for (let i = 0; i < pts.length; i++) {
          const a = pts[i];
          const b = pts[(i + 1) % pts.length];

          if (!bezier.closed && i === pts.length - 1) break;

          const aLocal = bezierToLocal({ x: a.x, y: a.y }, w, h);
          const bLocal = bezierToLocal({ x: b.x, y: b.y }, w, h);

          const h1 = a.out ? bezierToLocal(a.out, w, h) : aLocal;
          const h2 = b.in ? bezierToLocal(b.in, w, h) : bLocal;

          const hasHandles = Boolean(a.out || b.in);
          if (!hasHandles) ctx.lineTo(bLocal.x, bLocal.y);
          else ctx.bezierCurveTo(h1.x, h1.y, h2.x, h2.y, bLocal.x, bLocal.y);
        }

        if (bezier.closed) ctx.closePath();
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
