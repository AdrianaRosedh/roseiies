// apps/studio/app/studio/editor-core/canvas/item/ItemNode.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Group, Text, Rect } from "react-konva";
import type Konva from "konva";
import type { CornerRadii, CurvaturePath, PolygonPath, StudioItem } from "../../types";

import CornerSmartHandlesPro from "./overlays/CornerSmartHandlesPro";
import LiveCornersOverlay from "./overlays/LiveCornersOverlay";
import CurvatureEditorOverlay from "./overlays/CurvatureEditorOverlay";
import PolygonEditorOverlay from "./overlays/PolygonEditorOverlay";
import BezierEditorOverlay from "./overlays/BezierEditorOverlay";

import ItemBody from "./render/ItemBody";

import { clamp, rgba } from "./utils/paint";
import { isPillLike, isRectLike, isTree } from "./utils/predicates";

import { useSelectionUIRaf } from "./hooks/useSelectionUIRaf";
import { useReadableLabel } from "./hooks/useReadableLabel";
import { useKonvaCache } from "./hooks/useKonvaCache";

export type EditMode = "none" | "corners" | "polygon" | "curvature" | "bezier";

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

function ItemNodeImpl(props: Props) {
  const groupRef = useRef<Konva.Group>(null);
  const rectRef = useRef<Konva.Rect>(null);
  const textRef = useRef<Konva.Text>(null);

  const isBed = props.item.type === "bed";
  const [hovered, setHovered] = useState(false);
  const zones = isBed && Array.isArray(props.item.meta?.zones) ? props.item.meta.zones : null;

  const showZones =
    Boolean(zones?.length) &&
    // always show when selected/hovered; also show when zoomed in a bit
    (props.selected || hovered || props.stageScale > 0.85);

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

  // selection UI rAF throttle
  const selectionUIRaf = useSelectionUIRaf(props.onSelectionUI);

  // label readable rAF helper
  const keepLabelReadableRaf = useReadableLabel({ groupRef, textRef });

  const transformStartRef = useRef<{ x: number; y: number } | null>(null);

  const s = props.item.style;
  const fill = rgba(s.fill, s.fillOpacity);
  const stroke = rgba(s.stroke, s.strokeOpacity);
  const shadow = s.shadow;
  const shadowColor = shadow ? rgba(shadow.color, shadow.opacity) : "transparent";
  const shadowColorForKonva = shadowColor;

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

  const code = (props.item.meta as any)?.code as string | undefined;
  const showCode = Boolean(code) && (isSelected || hovered || props.stageScale > 1.05);

  // ✅ IMPORTANT: prevent caching “empty” before images load
  const assetsReady = useMemo(() => {
    if (props.item.type === "bed") return Boolean(props.soilImg);
    if (props.item.type === "tree") return Boolean(treeImg);
    return true;
  }, [props.item.type, props.soilImg, treeImg]);

  // ✅ bump cache when assets become ready (forces recache)
  const cacheKey = useMemo(() => {
    if (props.item.type === "bed") return `bed:soil:${props.soilImg ? 1 : 0}`;
    if (props.item.type === "tree") return `tree:${treeVariant}:${treeImg ? 1 : 0}`;
    return "";
  }, [props.item.type, props.soilImg, treeVariant, treeImg]);

  // optional caching for non-selected, non-hovered nodes
  useKonvaCache({
    groupRef,
    item: props.item,
    selected: props.selected,
    hovered,
    editMode: props.editMode,
    panMode: props.panMode,
    stageScale: props.stageScale,

    assetsReady,
    cacheKey,
  });

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
      <ItemBody
        item={props.item}
        isSelected={isSelected}
        rectRef={rectRef}
        fill={fill}
        stroke={stroke}
        shadowColor={shadowColorForKonva}
        soilImg={props.soilImg}
        treeImg={treeImg}
        rectCornerRadius={rectCornerRadius}
        draftCurv={draftCurv}
        draftPoly={draftPoly}
      />

      {/* Bed zones overlay (visual only) */}
      {showZones && zones ? (
        <Group listening={false}>
          {zones.map((z, idx) => {
            const zx = (z.x ?? 0) * props.item.w;
            const zy = (z.y ?? 0) * props.item.h;
            const zw = (z.w ?? 0) * props.item.w;
            const zh = (z.h ?? 0) * props.item.h;

            const zcode = String((z as any).code ?? "").trim();
            const label = zcode || (z as any).label || "";

            // avoid noisy labels when zoomed out
            const showZLabel = Boolean(label) && (props.selected || hovered || props.stageScale > 1.0);

            return (
              <Group key={`${zcode || idx}`} listening={false}>
                <Rect
                  x={zx}
                  y={zy}
                  width={zw}
                  height={zh}
                  fillEnabled={false}
                  stroke={"rgba(15,23,42,0.22)"}
                  strokeWidth={1}
                  dash={[6, 6]}
                  cornerRadius={6}
                  listening={false}
                />
                {showZLabel ? (
                  <Text
                    x={zx + 6}
                    y={zy + 4}
                    text={label}
                    fontSize={10}
                    fill={"rgba(15,23,42,0.45)"}
                    listening={false}
                  />
                ) : null}
              </Group>
            );
          })}
        </Group>
      ) : null}

      {/* Label + code (subtle) */}
      {showLabel ? (
        <Group listening={false}>
          <Text
            ref={textRef}
            x={0}
            y={-22}
            text={props.item.label || ""}
            fontSize={12}
            fill="rgba(15,23,42,0.65)"
            listening={false}
          />
          {showCode ? (
            <Text
              x={0}
              y={-10}
              text={String(code)}
              fontSize={10}
              fill="rgba(15,23,42,0.40)"
              listening={false}
            />
          ) : null}
        </Group>
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
      {isSelected &&
      !props.locked &&
      props.editMode === "curvature" &&
      (props.item.meta.curvature || draftCurv) ? (
        <CurvatureEditorOverlay
          w={props.item.w}
          h={props.item.h}
          path={(draftCurv ?? props.item.meta.curvature)!}
          onDraft={(d) => setDraftCurv(d)}
          onCommit={(d) => props.onCommit({ meta: { ...props.item.meta, curvature: d } })}
        />
      ) : null}

      {/* Polygon editor */}
      {isSelected &&
      !props.locked &&
      props.editMode === "polygon" &&
      (props.item.meta.polygon || draftPoly) ? (
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