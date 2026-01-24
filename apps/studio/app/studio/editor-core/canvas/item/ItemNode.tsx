// apps/studio/app/studio/editor-core/canvas/item/ItemNode.tsx
"use client";

import React, { useMemo, useRef, useState } from "react";
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
  multiSelect: boolean;

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

  const isSelected = props.selected;

  const isBed = props.item.type === "bed";
  const [hovered, setHovered] = useState(false);
  const zones = isBed && Array.isArray(props.item.meta?.zones) ? props.item.meta.zones : null;

  const showZones =
    Boolean(zones?.length) &&
    (props.selected || hovered || props.stageScale > 0.85);

  const [draftCurv, setDraftCurv] = useState<CurvaturePath | null>(null);
  const [draftPoly, setDraftPoly] = useState<PolygonPath | null>(null);

  const selectionUIRaf = useSelectionUIRaf(props.onSelectionUI);
  const keepLabelReadableRaf = useReadableLabel({ groupRef, textRef });

  const transformStartRef = useRef<{ x: number; y: number } | null>(null);

  const s = props.item.style;
  const fill = rgba(s.fill, s.fillOpacity);
  const stroke = rgba(s.stroke, s.strokeOpacity);
  const shadow = s.shadow;
  const shadowColor = shadow ? rgba(shadow.color, shadow.opacity) : "transparent";

  const treeVariant = props.item.meta?.tree?.variant ?? "tree-01";
  const treeImg = props.treeImages?.[treeVariant];

  const radiusMax = Math.min(props.item.w, props.item.h) / 2;
  const showLabel = props.selected || hovered;

  const cx = props.item.w / 2;
  const cy = props.item.h / 2;

  const perCorner = props.item.meta.cornerRadii as CornerRadii | undefined;
  const rectCornerRadius = perCorner
    ? ([perCorner.tl, perCorner.tr, perCorner.br, perCorner.bl] as any)
    : clamp(s.radius ?? 0, 0, radiusMax);

  // Only show per-item corner handles when explicitly editing corners (single-select mode)
  const isEditingAltShape =
    props.editMode === "polygon" || props.editMode === "curvature" || props.editMode === "bezier";

  // ✅ Single-select default: show corner handles (resize + rotate combined)
  // ✅ Never show per-item handles in multi-select
  // ✅ Hide when editing polygon/curvature/bezier (those overlays take over)
  const showCorners =
    isSelected &&
    !props.multiSelect &&
    !props.locked &&
    !isPillLike(props.item) &&
    !isEditingAltShape;



  const showBezier = Boolean(props.item.meta.bezier);
  const showCurv = Boolean(draftCurv ?? props.item.meta.curvature);
  const showPoly = Boolean(draftPoly ?? props.item.meta.polygon);

  const code = (props.item.meta as any)?.code as string | undefined;
  const showCode = Boolean(code) && props.selected;

  // ✅ prevent caching empty before images load
  const assetsReady = useMemo(() => {
    if (props.item.type === "bed") return Boolean(props.soilImg);
    if (props.item.type === "tree") return Boolean(treeImg);
    return true;
  }, [props.item.type, props.soilImg, treeImg]);

  const cacheKey = useMemo(() => {
    if (props.item.type === "bed") return `bed:soil:${props.soilImg ? (props.soilImg.src ?? "1") : "0"}`;
    if (props.item.type === "tree") return `tree:${treeVariant}:${treeImg ? "1" : "0"}`;
    return "";
  }, [props.item.type, props.soilImg, treeVariant, treeImg]);

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
      ref={(n) => {
        groupRef.current = n;
        props.onRegister(n);
      }}
      // ✅ CRITICAL: stable Konva id so Stage can find this node deterministically
      id={props.item.id}
      name="studio-item"
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
        props.onSelectionUI(); // ✅ immediate
      }}
      onTap={(e) => {
        e.cancelBubble = true;
        props.onSelect({ shiftKey: false });
        props.onSelectionUI(); // ✅ immediate
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
        props.onSelectionUI();
      }}
      onTransformStart={(e) => {
        e.cancelBubble = true;
        const node = e.target as Konva.Group;
        try {
          if (node.isCached()) node.clearCache();
        } catch {}
        transformStartRef.current = { x: node.x(), y: node.y() };
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
        props.onSelectionUI();
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
      <ItemBody
        item={props.item}
        isSelected={props.selected}
        rectRef={rectRef}
        fill={fill}
        stroke={stroke}
        shadowColor={shadowColor}
        soilImg={props.soilImg}
        treeImg={treeImg}
        rectCornerRadius={rectCornerRadius}
        draftCurv={draftCurv}
        draftPoly={draftPoly}
      />

      {showZones && zones ? (
        <Group listening={false}>
          {zones.map((z, idx) => {
            const zx = (z.x ?? 0) * props.item.w;
            const zy = (z.y ?? 0) * props.item.h;
            const zw = (z.w ?? 0) * props.item.w;
            const zh = (z.h ?? 0) * props.item.h;

            const zcode = String((z as any).code ?? "").trim();
            const label = zcode || (z as any).label || "";
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

      {props.selected &&
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

      {props.selected &&
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

      {props.selected &&
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

      {props.selected && !props.locked && props.editMode === "bezier" && props.item.meta.bezier ? (
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
