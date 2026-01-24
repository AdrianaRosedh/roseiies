// apps/studio/app/studio/editor-core/canvas/item/render/ItemBody.tsx
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

  soilImg?: HTMLImageElement | null;
  treeImg?: HTMLImageElement;

  rectCornerRadius: any;

  draftCurv: CurvaturePath | null;
  draftPoly: PolygonPath | null;
}) {
  const { item, isSelected, rectRef, fill, stroke, shadowColor, soilImg, treeImg, rectCornerRadius } = props;

  const s = item.style;
  const shadow = s.shadow;

  const isBed = item.type === "bed";

  const showBezier = Boolean(item.meta.bezier);
  const showCurv = Boolean(props.draftCurv ?? item.meta.curvature);
  const showPoly = Boolean(props.draftPoly ?? item.meta.polygon);

  return (
    <>
      {showBezier ? (
        <BezierShape
          item={item}
          fill={fill}
          stroke={isSelected ? "rgba(15,23,42,0.28)" : stroke}
          strokeWidth={isSelected ? 1.4 : s.strokeWidth}
          shadowColor={shadowColor}
          shadowBlur={shadow?.blur ?? 10}
          shadowOffsetX={shadow?.offsetX ?? 0}
          shadowOffsetY={shadow?.offsetY ?? 10}
        />
      ) : showCurv ? (
        <CurvatureShape
          item={item}
          path={(props.draftCurv ?? item.meta.curvature)!}
          fill={fill}
          stroke={isSelected ? "rgba(15,23,42,0.28)" : stroke}
          strokeWidth={isSelected ? 1.4 : s.strokeWidth}
          shadowColor={shadowColor}
          shadowBlur={shadow?.blur ?? 10}
          shadowOffsetX={shadow?.offsetX ?? 0}
          shadowOffsetY={shadow?.offsetY ?? 10}
        />
      ) : showPoly ? (
        <PolygonShape
          item={item}
          path={(props.draftPoly ?? item.meta.polygon)!}
          fill={fill}
          stroke={isSelected ? "rgba(15,23,42,0.28)" : stroke}
          strokeWidth={isSelected ? 1.4 : s.strokeWidth}
          shadowColor={shadowColor}
          shadowBlur={shadow?.blur ?? 10}
          shadowOffsetX={shadow?.offsetX ?? 0}
          shadowOffsetY={shadow?.offsetY ?? 10}
        />
      ) : isPillLike(item) ? (
        <Rect
          width={item.w}
          height={item.h}
          fill={fill}
          stroke={isSelected ? "rgba(15,23,42,0.28)" : stroke}
          strokeWidth={isSelected ? 1.4 : s.strokeWidth}
          cornerRadius={Math.min(item.w, item.h) / 2}
          shadowColor={shadowColor}
          shadowBlur={shadow?.blur ?? 10}
          shadowOpacity={0.35}
          shadowOffsetX={shadow?.offsetX ?? 0}
          shadowOffsetY={shadow?.offsetY ?? 10}
          shadowEnabled
          perfectDrawEnabled={false}
        />
      ) : isRectLike(item) ? (
        <Group>
          {/* ✅ HIT TARGET (ensures beds/rects always clickable) */}
          <Rect
            x={0}
            y={0}
            width={item.w}
            height={item.h}
            fill="rgba(0,0,0,0.001)"
            listening
            perfectDrawEnabled={false}
          />

          {/* AO shadow */}
          <Rect
            x={2.5}
            y={3.5}
            width={item.w - 5}
            height={item.h - 5}
            cornerRadius={rectCornerRadius}
            fill="rgba(0,0,0,0.22)"
            opacity={0.18}
            listening={false}
            perfectDrawEnabled={false}
          />

          <Rect
            ref={rectRef}
            width={item.w}
            height={item.h}
            cornerRadius={rectCornerRadius}
            fill={isBed ? undefined : fill}
            fillPatternImage={isBed ? (soilImg ?? undefined) : undefined}
            fillPatternRepeat={isBed ? "repeat" : undefined}
            fillPatternScale={isBed ? { x: 0.55, y: 0.55 } : undefined}
            stroke={isSelected ? "rgba(15,23,42,0.22)" : stroke}
            strokeWidth={isSelected ? 1.4 : s.strokeWidth}
            shadowColor={shadowColor}
            shadowBlur={shadow?.blur ?? 10}
            shadowOpacity={0.32}
            shadowOffsetX={shadow?.offsetX ?? 0}
            shadowOffsetY={shadow?.offsetY ?? 10}
            shadowEnabled
            perfectDrawEnabled={false}
          />

          {isBed ? (
            <Rect
              width={item.w}
              height={item.h}
              cornerRadius={rectCornerRadius}
              fillLinearGradientStartPoint={{ x: 0, y: 0 }}
              fillLinearGradientEndPoint={{ x: 0, y: item.h }}
              fillLinearGradientColorStops={[
                0,
                "rgba(255,255,255,0.10)",
                0.5,
                "rgba(255,255,255,0.02)",
                1,
                "rgba(0,0,0,0.18)",
              ]}
              opacity={0.6}
              listening={false}
              perfectDrawEnabled={false}
            />
          ) : null}

          {/* highlight stroke */}
          <Rect
            width={item.w}
            height={item.h}
            cornerRadius={rectCornerRadius}
            stroke="rgba(255,255,255,0.30)"
            strokeWidth={1.6}
            listening={false}
            perfectDrawEnabled={false}
          />
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
            <KonvaImage x={0} y={0} width={item.w} height={item.h} image={treeImg} listening={false} />
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