"use client";

import React from "react";
import { Group, Rect, Ellipse, Image as KonvaImage } from "react-konva";
import type Konva from "konva";
import type { CurvaturePath, PolygonPath, StudioItem } from "../../../types";

import BezierShape from "../shapes/BezierShape";
import CurvatureShape from "../shapes/CurvatureShape";
import PolygonShape from "../shapes/PolygonShape";

import { isPillLike, isRectLike, isTree } from "../utils/predicates";

export default function ItemBody(props: {
  item: StudioItem;
  isSelected: boolean;
  rectRef: React.RefObject<Konva.Rect | null>;

  fill: string;
  stroke: string;
  shadowColor: string;

  soilImg?: HTMLImageElement | null; // kept for signature compatibility, but no longer used
  treeImg?: HTMLImageElement;

  rectCornerRadius: any;

  draftCurv: CurvaturePath | null;
  draftPoly: PolygonPath | null;
}) {
  const { item, isSelected, rectRef, fill, stroke, treeImg, rectCornerRadius } = props;

  const s = item.style;
  const showBezier = Boolean(item.meta.bezier);
  const showCurv = Boolean(props.draftCurv ?? item.meta.curvature);
  const showPoly = Boolean(props.draftPoly ?? item.meta.polygon);

  const strokeCol = isSelected ? "rgba(15,23,42,0.35)" : stroke;
  const strokeW = isSelected ? 1.8 : (s.strokeWidth ?? 1.2);

  return (
    <>
      {showBezier ? (
        <BezierShape
          item={item}
          fill={fill}
          stroke={strokeCol}
          strokeWidth={strokeW}
          shadowColor={"rgba(0,0,0,0)"} // ✅ no shadows
          shadowBlur={0}
          shadowOffsetX={0}
          shadowOffsetY={0}
        />
      ) : showCurv ? (
        <CurvatureShape
          item={item}
          path={(props.draftCurv ?? item.meta.curvature)!}
          fill={fill}
          stroke={strokeCol}
          strokeWidth={strokeW}
          shadowColor={"rgba(0,0,0,0)"} // ✅ no shadows
          shadowBlur={0}
          shadowOffsetX={0}
          shadowOffsetY={0}
        />
      ) : showPoly ? (
        <PolygonShape
          item={item}
          path={(props.draftPoly ?? item.meta.polygon)!}
          fill={fill}
          stroke={strokeCol}
          strokeWidth={strokeW}
          shadowColor={"rgba(0,0,0,0)"} // ✅ no shadows
          shadowBlur={0}
          shadowOffsetX={0}
          shadowOffsetY={0}
        />
      ) : isPillLike(item) ? (
        <Rect
          width={item.w}
          height={item.h}
          fill={fill}
          stroke={strokeCol}
          strokeWidth={strokeW}
          cornerRadius={Math.min(item.w, item.h) / 2}
          shadowEnabled={false}
          perfectDrawEnabled={false}
        />
      ) : isRectLike(item) ? (
        <Group>
          {/* ✅ HIT TARGET */}
          <Rect
            x={0}
            y={0}
            width={item.w}
            height={item.h}
            fill="rgba(0,0,0,0.001)"
            listening
            perfectDrawEnabled={false}
          />

          {/* ✅ Flat rect (beds no longer use soil textures or AO shadow layers) */}
          <Rect
            ref={rectRef}
            width={item.w}
            height={item.h}
            cornerRadius={rectCornerRadius}
            fill={fill}
            stroke={strokeCol}
            strokeWidth={strokeW}
            shadowEnabled={false}
            perfectDrawEnabled={false}
          />

          {/* ✅ Minimal inner highlight when selected (cheap + clear) */}
          {isSelected ? (
            <Rect
              x={1}
              y={1}
              width={Math.max(0, item.w - 2)}
              height={Math.max(0, item.h - 2)}
              cornerRadius={rectCornerRadius}
              stroke="rgba(255,255,255,0.55)"
              strokeWidth={1}
              listening={false}
              perfectDrawEnabled={false}
            />
          ) : null}
        </Group>
      ) : isTree(item) ? (
        <Group>
          {/* hit target */}
          <Rect
            x={0}
            y={0}
            width={item.w}
            height={item.h}
            fill="rgba(0,0,0,0.001)"
            listening
            perfectDrawEnabled={false}
          />
          {treeImg ? (
            <KonvaImage
              x={0}
              y={0}
              width={item.w}
              height={item.h}
              image={treeImg}
              listening={false}
            />
          ) : null}
        </Group>
      ) : (
        <Ellipse
          x={item.w / 2}
          y={item.h / 2 + item.h * 0.08}
          radiusX={item.w * 0.28}
          radiusY={item.h * 0.22}
          fill="rgba(15,23,42,0.04)"
          listening={false}
          perfectDrawEnabled={false}
        />
      )}
    </>
  );
}
