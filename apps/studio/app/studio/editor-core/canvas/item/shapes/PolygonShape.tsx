// apps/studio/app/studio/editor-core/canvas/item/shapes/PolygonShape.tsx
"use client";

import React from "react";
import { Shape } from "react-konva";
import type { StudioItem, PolygonPath } from "../../../types";

export default function PolygonShape(props: {
  item: StudioItem;
  path: PolygonPath;
  fill: string;
  stroke: string;
  strokeWidth: number;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
}) {
  const poly = props.path;
  const w = props.item.w;
  const h = props.item.h;

  return (
    <Shape
      sceneFunc={(ctx, shape) => {
        const pts = poly.points;
        if (!pts?.length) {
          ctx.beginPath();
          ctx.rect(0, 0, w, h);
          ctx.closePath();
          ctx.fillStrokeShape(shape);
          return;
        }

        ctx.beginPath();
        ctx.moveTo(pts[0].x * w, pts[0].y * h);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x * w, pts[i].y * h);
        if (poly.closed) ctx.closePath();
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
