"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Group, Rect, Text, Ellipse, Image as KonvaImage } from "react-konva";
import type Konva from "konva";
import type { CornerRadii, CurvaturePath, PolygonPath, StudioItem } from "../../types";

import BezierShape from "./shapes/BezierShape";
import CurvatureShape from "./shapes/CurvatureShape";
import PolygonShape from "./shapes/PolygonShape";

import CornerSmartHandlesPro from "./overlays/CornerSmartHandlesPro";
import LiveCornersOverlay from "./overlays/LiveCornersOverlay";
import CurvatureEditorOverlay from "./overlays/CurvatureEditorOverlay";
import PolygonEditorOverlay from "./overlays/PolygonEditorOverlay";
import BezierEditorOverlay from "./overlays/BezierEditorOverlay";

/* ---------------- Local utils ---------------- */

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function rgba(hex: string, opacity: number) {
  const h = hex.replace("#", "").trim();
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}

function isPillLike(item: StudioItem) {
  return item.type === "path" || item.type === "label";
}
function isRectLike(item: StudioItem) {
  return item.type === "bed" || item.type === "zone" || item.type === "structure";
}
function isTree(item: StudioItem) {
  return item.type === "tree";
}

export type EditMode = "none" | "corners" | "polygon" | "curvature" | "bezier";

function memoEqual(a: Props, b: Props) {
  return (
    a.item === b.item &&
    a.selected === b.selected &&
    a.locked === b.locked &&
    a.stageScale === b.stageScale &&
    a.editMode === b.editMode &&
    a.panMode === b.panMode &&
    a.treeImages === b.treeImages &&
    a.soilImg === b.soilImg
  );
}

type Props = {
  item: StudioItem;
  selected: boolean;
  locked: boolean;
  stageScale: number;
  editMode: EditMode;
  isCoarse: boolean;
  treeImages?: Record<string, HTMLImageElement>;
  soilImg?: HTMLImageElement | null;
  panMode: boolean;

  setWrapCursor: (cursor: string) => void;

  onRegister: (node: Konva.Node | null) => void;
  onSelect: (evt: { shiftKey: boolean }) => void;
  onCommit: (patch: Partial<StudioItem>) => void;
  onSelectionUI: () => void;
};

function ItemNodeImpl(props: Props) {
  const groupRef = useRef<Konva.Group>(null);
  const rectRef = useRef<Konva.Rect>(null);
  const textRef = useRef<Konva.Text>(null);
  const isBed = props.item.type === "bed";

  const [hovered, setHovered] = useState(false);

  // Draft geometry for edit modes (NO store writes during drag)
  const [draftCurv, setDraftCurv] = useState<CurvaturePath | null>(null);
  const [draftPoly, setDraftPoly] = useState<PolygonPath | null>(null);

  // register/unregister node
  useEffect(() => {
    props.onRegister(groupRef.current);
    return () => props.onRegister(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // sync drafts when entering edit mode or item changes
  useEffect(() => {
    if (!props.selected) {
      setDraftCurv(null);
      setDraftPoly(null);
      return;
    }

    if (props.editMode === "curvature" && props.item.meta.curvature)
      setDraftCurv(structuredClone(props.item.meta.curvature));
    else setDraftCurv(null);

    if (props.editMode === "polygon" && props.item.meta.polygon)
      setDraftPoly(structuredClone(props.item.meta.polygon));
    else setDraftPoly(null);
  }, [props.selected, props.editMode, props.item.id]);

  // ✅ Throttle selection UI updates to 1/frame (drag + transform get spammy)
  const selRafRef = useRef<number | null>(null);
  const selectionUIRaf = useCallback(() => {
    if (selRafRef.current != null) return;
    selRafRef.current = requestAnimationFrame(() => {
      selRafRef.current = null;
      props.onSelectionUI();
    });
  }, [props.onSelectionUI]);

  useEffect(() => {
    return () => {
      if (selRafRef.current != null) cancelAnimationFrame(selRafRef.current);
    };
  }, []);

  // Keep label readable only when group scaling changes (rAF, no forced batchDraw spam)
  const labelRafRef = useRef<number | null>(null);
  const keepLabelReadableRaf = useCallback(() => {
    if (labelRafRef.current != null) return;
    labelRafRef.current = requestAnimationFrame(() => {
      labelRafRef.current = null;

      const g = groupRef.current;
      const t = textRef.current;
      if (!g || !t) return;

      const sx = g.scaleX();
      const sy = g.scaleY();

      if (Math.abs(sx) > 1e-6) t.scaleX(1 / sx);
      if (Math.abs(sy) > 1e-6) t.scaleY(1 / sy);

      t.rotation(-g.rotation());
      // no batchDraw here; Konva will draw naturally via the transform cycle
    });
  }, []);

  useEffect(() => {
    return () => {
      if (labelRafRef.current != null) cancelAnimationFrame(labelRafRef.current);
    };
  }, []);

  // ✅ Optional lightweight caching for non-selected items (huge win when many beds)
  const cacheRafRef = useRef<number | null>(null);
  useEffect(() => {
    const g = groupRef.current;
    if (!g) return;

    const isSelected = props.selected;
    const canCache =
      !isSelected &&
      !hovered &&
      props.editMode === "none" &&
      !props.panMode;

    // avoid caching enormous nodes (memory spike)
    const pxW = props.item.w * props.stageScale;
    const pxH = props.item.h * props.stageScale;
    const pxArea = pxW * pxH;
    const CACHE_AREA_MAX = 1.2e6; // ~1.2 MP

    const shouldCache =
      canCache && pxArea > 0 && pxArea < CACHE_AREA_MAX;

    if (cacheRafRef.current != null) {
      cancelAnimationFrame(cacheRafRef.current);
      cacheRafRef.current = null;
    }

    cacheRafRef.current = requestAnimationFrame(() => {
      cacheRafRef.current = null;
      try {
        if (shouldCache) {
          if (!g.isCached()) {
            g.cache({ pixelRatio: 1 });
            g.getLayer()?.batchDraw();
          }
        } else {
          if (g.isCached()) {
            g.clearCache();
            g.getLayer()?.batchDraw();
          }
        }
      } catch {
        // ignore cache errors (rare, but can happen mid-destroy)
      }
    });

    return () => {
      if (cacheRafRef.current != null) cancelAnimationFrame(cacheRafRef.current);
    };
  }, [
    props.selected,
    hovered,
    props.editMode,
    props.panMode,
    props.item.w,
    props.item.h,
    props.stageScale,
  ]);

  const transformStartRef = useRef<{ x: number; y: number } | null>(null);

  const s = props.item.style;
  const fill = rgba(s.fill, s.fillOpacity);
  const stroke = rgba(s.stroke, s.strokeOpacity);
  const shadow = s.shadow;
  const shadowColor = shadow ? rgba(shadow.color, shadow.opacity) : "transparent";

  const treeVariant = props.item.meta?.tree?.variant ?? "tree-01";
  const treeImg = props.treeImages?.[treeVariant];

  const isSelected = props.selected;
  const radiusMax = Math.min(props.item.w, props.item.h) / 2;

  const showLabel = isSelected || hovered || props.stageScale > 0.9;

  // Center pivot
  const cx = props.item.w / 2;
  const cy = props.item.h / 2;

  const perCorner = props.item.meta.cornerRadii as CornerRadii | undefined;
  const rectCornerRadius = perCorner
    ? ([perCorner.tl, perCorner.tr, perCorner.br, perCorner.bl] as any)
    : clamp(s.radius ?? 0, 0, radiusMax);

  const showCorners = isSelected && !props.locked && !isPillLike(props.item);

  // Render priority: bezier > curvature > polygon > defaults
  const showBezier = Boolean(props.item.meta.bezier);
  const showCurv = Boolean(draftCurv ?? props.item.meta.curvature);
  const showPoly = Boolean(draftPoly ?? props.item.meta.polygon);

  return (
    <Group
      ref={groupRef}
      x={props.item.x + cx}
      y={props.item.y + cy}
      offsetX={cx}
      offsetY={cy}
      rotation={props.item.r}
      draggable={!props.locked && !props.panMode}
      opacity={props.locked ? 0.92 : 1}
      onClick={(e) => {
        e.cancelBubble = true;
        props.onSelect({ shiftKey: Boolean(e.evt?.shiftKey) });
      }}
      onTap={(e) => {
        e.cancelBubble = true;
        props.onSelect({ shiftKey: false });
      }}
      onDragMove={(e) => {
        e.cancelBubble = true;
        selectionUIRaf();
      }}
      onDragEnd={(e) => {
        e.cancelBubble = true;
        const nx = e.target.x() - cx;
        const ny = e.target.y() - cy;
        props.onCommit({ x: nx, y: ny });
      }}
      onTransformStart={(e) => {
        e.cancelBubble = true;
        const node = e.target as Konva.Group;

        // if we were cached, clear it before interactive transforms
        try {
          if (node.isCached()) node.clearCache();
        } catch {}

        transformStartRef.current = { x: node.x(), y: node.y() }; // center point
      }}
      onTransform={() => {
        const node = groupRef.current;
        if (node && transformStartRef.current) node.position(transformStartRef.current);

        keepLabelReadableRaf();
        selectionUIRaf();
      }}
      onTransformEnd={(e) => {
        e.cancelBubble = true;
        const node = e.target as Konva.Group;

        const start = transformStartRef.current ?? { x: node.x(), y: node.y() };

        const scaleX = node.scaleX();
        const scaleY = node.scaleY();

        const nextW = Math.max(24, props.item.w * scaleX);
        const nextH = Math.max(24, props.item.h * scaleY);

        const nextCx = nextW / 2;
        const nextCy = nextH / 2;

        node.scaleX(1);
        node.scaleY(1);
        node.position(start);

        const topLeftX = start.x - nextCx;
        const topLeftY = start.y - nextCy;

        transformStartRef.current = null;

        if (textRef.current) {
          textRef.current.scaleX(1);
          textRef.current.scaleY(1);
        }

        props.onCommit({
          x: topLeftX,
          y: topLeftY,
          w: nextW,
          h: nextH,
          r: node.rotation(),
        });
      }}
      onMouseEnter={() => {
        setHovered(true);
        props.setWrapCursor("default");
      }}
      onMouseLeave={() => {
        setHovered(false);
        props.setWrapCursor("default");
      }}
    >
      {/* ---- Body ---- */}
      {showBezier ? (
        <BezierShape
          item={props.item}
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
          item={props.item}
          path={(draftCurv ?? props.item.meta.curvature)!}
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
          item={props.item}
          path={(draftPoly ?? props.item.meta.polygon)!}
          fill={fill}
          stroke={isSelected ? "rgba(15,23,42,0.28)" : stroke}
          strokeWidth={isSelected ? 1.4 : s.strokeWidth}
          shadowColor={shadowColor}
          shadowBlur={shadow?.blur ?? 10}
          shadowOffsetX={shadow?.offsetX ?? 0}
          shadowOffsetY={shadow?.offsetY ?? 10}
        />
      ) : isPillLike(props.item) ? (
        <Rect
          width={props.item.w}
          height={props.item.h}
          fill={fill}
          stroke={isSelected ? "rgba(15,23,42,0.28)" : stroke}
          strokeWidth={isSelected ? 1.4 : s.strokeWidth}
          cornerRadius={Math.min(props.item.w, props.item.h) / 2}
          shadowColor={shadowColor}
          shadowBlur={shadow?.blur ?? 10}
          shadowOpacity={0.35}
          shadowOffsetX={shadow?.offsetX ?? 0}
          shadowOffsetY={shadow?.offsetY ?? 10}
          shadowEnabled
          perfectDrawEnabled={false}
        />
      ) : isRectLike(props.item) ? (
        <Group>
          {/* AO shadow */}
          <Rect
            x={2.5}
            y={3.5}
            width={props.item.w - 5}
            height={props.item.h - 5}
            cornerRadius={rectCornerRadius}
            fill="rgba(0,0,0,0.22)"
            opacity={0.18}
            listening={false}
            perfectDrawEnabled={false}
          />

          <Rect
            ref={rectRef}
            width={props.item.w}
            height={props.item.h}
            cornerRadius={rectCornerRadius}
            fill={isBed ? undefined : fill}
            fillPatternImage={isBed ? (props.soilImg ?? undefined) : undefined}
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
              width={props.item.w}
              height={props.item.h}
              cornerRadius={rectCornerRadius}
              fillLinearGradientStartPoint={{ x: 0, y: 0 }}
              fillLinearGradientEndPoint={{ x: 0, y: props.item.h }}
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

          <Rect
            width={props.item.w}
            height={props.item.h}
            cornerRadius={rectCornerRadius}
            stroke="rgba(255,255,255,0.30)"
            strokeWidth={1.6}
            listening={false}
            perfectDrawEnabled={false}
          />
        </Group>
      ) : isTree(props.item) ? (
        <Group>
          {/* hit target */}
          <Rect
            x={0}
            y={0}
            width={props.item.w}
            height={props.item.h}
            fill="rgba(0,0,0,0.001)"
            listening
            perfectDrawEnabled={false}
          />
          {treeImg ? (
            <KonvaImage
              x={0}
              y={0}
              width={props.item.w}
              height={props.item.h}
              image={treeImg}
              listening={false}
            />
          ) : null}
        </Group>
      ) : (
        <Ellipse
          x={props.item.w / 2}
          y={props.item.h / 2 + props.item.h * 0.08}
          radiusX={props.item.w * 0.28}
          radiusY={props.item.h * 0.22}
          fill="rgba(15,23,42,0.04)"
          listening={false}
          perfectDrawEnabled={false}
        />
      )}

      {/* Optional label (kept minimal; doesn’t do anything if you don’t set item.name) */}
      {showLabel && props.item.label ? (
        <Text
          ref={textRef}
          x={0}
          y={-18}
          text={props.item.label}
          fontSize={12}
          fill="rgba(15,23,42,0.65)"
          listening={false}
        />
      ) : null}

      {/* Corner handles */}
      {showCorners ? (
        <CornerSmartHandlesPro
          w={props.item.w}
          h={props.item.h}
          groupRef={groupRef}
          minSize={24}
          setWrapCursor={props.setWrapCursor}
          onSelectionUI={selectionUIRaf}
          onCommit={(patch) => props.onCommit(patch as any)}
          isCoarse={props.isCoarse}
          lockAspect={isTree(props.item)}
        />
      ) : null}

      {/* Live corners edit */}
      {isSelected &&
      !props.locked &&
      props.editMode === "corners" &&
      isRectLike(props.item) &&
      !showBezier &&
      !showCurv &&
      !showPoly ? (
        <LiveCornersOverlay
          w={props.item.w}
          h={props.item.h}
          rectRef={rectRef}
          currentUniformRadius={clamp(s.radius ?? 0, 0, radiusMax)}
          cornerRadii={perCorner}
          onCommit={(next) => {
            if ("uniform" in next) {
              props.onCommit({
                style: { ...props.item.style, radius: next.uniform },
                meta: { ...props.item.meta, cornerRadii: undefined },
              });
            } else {
              props.onCommit({ meta: { ...props.item.meta, cornerRadii: next.corners } });
            }
          }}
        />
      ) : null}

      {/* Curvature editor */}
      {isSelected && !props.locked && props.editMode === "curvature" && (props.item.meta.curvature || draftCurv) ? (
        <CurvatureEditorOverlay
          w={props.item.w}
          h={props.item.h}
          path={(draftCurv ?? props.item.meta.curvature)!}
          onDraft={(d) => setDraftCurv(d)}
          onCommit={(d) => props.onCommit({ meta: { ...props.item.meta, curvature: d } })}
        />
      ) : null}

      {/* Polygon editor */}
      {isSelected && !props.locked && props.editMode === "polygon" && (props.item.meta.polygon || draftPoly) ? (
        <PolygonEditorOverlay
          w={props.item.w}
          h={props.item.h}
          path={(draftPoly ?? props.item.meta.polygon)!}
          onDraft={(d) => setDraftPoly(d)}
          onCommit={(d) => props.onCommit({ meta: { ...props.item.meta, polygon: d } })}
        />
      ) : null}

      {/* Bezier editor */}
      {isSelected && !props.locked && props.editMode === "bezier" && props.item.meta.bezier ? (
        <BezierEditorOverlay
          w={props.item.w}
          h={props.item.h}
          path={props.item.meta.bezier}
          onChange={(next) => props.onCommit({ meta: { ...props.item.meta, bezier: next } })}
        />
      ) : null}
    </Group>
  );
}

const ItemNode = React.memo(ItemNodeImpl, memoEqual);
export default ItemNode;
