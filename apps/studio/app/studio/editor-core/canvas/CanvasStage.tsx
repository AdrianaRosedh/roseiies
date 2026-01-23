// apps/studio/app/studio/editor-core/canvas/CanvasStage.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Layer, Stage, Transformer, Line } from "react-konva";
import type Konva from "konva";

import type { LayoutDoc, StudioItem, StudioModule, ItemType } from "../types";

// hooks
import useStageSize from "./hooks/useStageSize";
import useIsCoarsePointer from "./hooks/useIsCoarsePointer";
import { useSelectionUIBox } from "./hooks/useSelectionUIBox";
import { usePan } from "./hooks/usePan";
import { useZoom } from "./hooks/useZoom";
import { useTextures } from "./hooks/useTextures";
import useTreeImages from "./hooks/useTreeImages";

// components
import PlotControls from "./components/PlotControls";
import PlotHud from "./components/PlotHud";
import StageBackground from "./components/StageBackground";
import PlotSurface from "./components/PlotSurface";
import Grid from "./components/Grid";
import PlotResizeHandle from "./components/PlotResizeHandle";
import FloatingToolbar from "./components/FloatingToolbar/FloatingToolbar";

// item
import ItemNode from "./item/ItemNode";

type EditMode = "none" | "corners" | "polygon" | "curvature" | "bezier";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function samePos(a: { x: number; y: number }, b: { x: number; y: number }) {
  return a.x === b.x && a.y === b.y;
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
function hasBezier(item: StudioItem) {
  return Boolean(item.meta?.bezier?.points?.length);
}
function hasCurvature(item: StudioItem) {
  return Boolean(item.meta?.curvature?.points?.length);
}
function hasPolygon(item: StudioItem) {
  return Boolean(item.meta?.polygon?.points?.length);
}

export default function CanvasStage(props: {
  module: StudioModule;
  doc: LayoutDoc;
  tool: ItemType;

  selectedIds: string[];
  setSelectedIds: (ids: string[]) => void;

  panMode: boolean;

  stageScale: number;
  setStageScale: (s: number) => void;

  stagePos: { x: number; y: number };
  setStagePos: (p: { x: number; y: number }) => void;

  onAddItemAtWorld: (args: { type: ItemType; x: number; y: number }) => void;
  onUpdateItem: (id: string, patch: Partial<StudioItem>) => void;
  onUpdateCanvas: (patch: Partial<LayoutDoc["canvas"]>) => void;

  setCursorWorld: (pos: { x: number; y: number } | null) => void;
  setViewportCenterWorld: (pos: { x: number; y: number } | null) => void;

  onCopySelected: () => void;
  onPasteAtCursor: () => void;
  onDeleteSelected: () => void;

  // ✅ shell-controlled
  showGrid?: boolean;

  // ✅ snap guides
  snapToGrid?: boolean;
  snapStep?: number;
  cursorWorld?: { x: number; y: number } | null;
  treePlacing?: boolean;
  setTreePlacing?: (v: boolean) => void;

}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const nodeMapRef = useRef<Map<string, Konva.Node>>(new Map());

  const isCoarse = useIsCoarsePointer();
  const stageSize = useStageSize(wrapRef);

  const [editMode, setEditMode] = useState<EditMode>("none");
  const [toolbarOffset, setToolbarOffset] = useState<{ dx: number; dy: number } | null>(null);

  const [showPlotBoundary, setShowPlotBoundary] = useState(true);
  const [editPlot, setEditPlot] = useState(false);
  const [draftCanvas, setDraftCanvas] = useState<{ w: number; h: number } | null>(null);

  const [constrainView, setConstrainView] = useState(true);

  useEffect(() => {
    if (editPlot) setShowPlotBoundary(true);
  }, [editPlot]);

  const plotW = draftCanvas?.w ?? props.doc.canvas.width;
  const plotH = draftCanvas?.h ?? props.doc.canvas.height;

  const MIN_PLOT_W = 640;
  const MIN_PLOT_H = 420;

  // keeps plot reachable in viewport
  const clampStagePosToPlot = useCallback(
    (pos: { x: number; y: number }) => {
      const pad = 90;

      const scaledW = plotW * props.stageScale;
      const scaledH = plotH * props.stageScale;

      const centerX = (stageSize.w - scaledW) / 2;
      const centerY = (stageSize.h - scaledH) / 2;

      let minX: number, maxX: number;
      if (scaledW + pad * 2 <= stageSize.w) {
        minX = maxX = centerX;
      } else {
        minX = stageSize.w - scaledW - pad;
        maxX = pad;
      }

      let minY: number, maxY: number;
      if (scaledH + pad * 2 <= stageSize.h) {
        minY = maxY = centerY;
      } else {
        minY = stageSize.h - scaledH - pad;
        maxY = pad;
      }

      return {
        x: Math.max(minX, Math.min(maxX, pos.x)),
        y: Math.max(minY, Math.min(maxY, pos.y)),
      };
    },
    [plotW, plotH, props.stageScale, stageSize.w, stageSize.h]
  );

  // ✅ IMPORTANT: only set if it actually changes (prevents loops)
  const setStagePosSmart = useCallback(
    (p: { x: number; y: number }) => {
      const next = constrainView ? clampStagePosToPlot(p) : p;
      if (!samePos(next, props.stagePos)) props.setStagePos(next);
    },
    [constrainView, clampStagePosToPlot, props.setStagePos, props.stagePos]
  );

  // ✅ Clamp once when turning constrainView ON (no dependency on props.stagePos)
  const prevConstrainRef = useRef(constrainView);
  useEffect(() => {
    const prev = prevConstrainRef.current;
    prevConstrainRef.current = constrainView;

    if (!prev && constrainView) {
      const next = clampStagePosToPlot(props.stagePos);
      if (!samePos(next, props.stagePos)) props.setStagePos(next);
    }
  }, [constrainView, clampStagePosToPlot, props.setStagePos, props.stagePos]);

  const itemsSorted = useMemo(
    () => [...props.doc.items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [props.doc.items]
  );

  const selectedItems = useMemo(() => {
    const set = new Set(props.selectedIds);
    return props.doc.items.filter((i) => set.has(i.id));
  }, [props.doc.items, props.selectedIds]);

  const single = selectedItems.length === 1 ? selectedItems[0] : null;
  const anyLocked = selectedItems.some((it) => Boolean(it.meta?.locked));
  const isSingleTree = single ? isTree(single) : false;

  const treeImages = useTreeImages();
  const textures = useTextures({ stagePos: props.stagePos });

  const selectionUI = useSelectionUIBox({
    wrapRef,
    stageRef,
    trRef,
    nodeMapRef,
    selectedIds: props.selectedIds,
    items: props.doc.items,
    stagePos: props.stagePos,
    stageScale: props.stageScale,
  });

  const cursorRef = useRef<string>("default");
  const setWrapCursor = useCallback((cursor: string) => {
    cursorRef.current = cursor;
    if (wrapRef.current) wrapRef.current.style.cursor = cursor;
  }, []);

  const worldFromScreen = useCallback(
    (p: { x: number; y: number }) => ({
      x: (p.x - props.stagePos.x) / props.stageScale,
      y: (p.y - props.stagePos.y) / props.stageScale,
    }),
    [props.stagePos.x, props.stagePos.y, props.stageScale]
  );

  useEffect(() => {
    props.setViewportCenterWorld(worldFromScreen({ x: stageSize.w / 2, y: stageSize.h / 2 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageSize.w, stageSize.h, props.stagePos.x, props.stagePos.y, props.stageScale]);

  const pan = usePan({
    stageRef,
    panMode: props.panMode,
    stagePos: props.stagePos,
    setStagePos: setStagePosSmart,
    stageScale: props.stageScale,
    setSelectedIds: props.setSelectedIds,
    setToolbarBox: selectionUI.setToolbarBox,
    setWrapCursor,
    cursorRef,
    setCursorWorld: props.setCursorWorld,
    updateSelectionUIRaf: selectionUI.updateSelectionUIRaf,
    worldFromScreen,
    onAddItemAtWorld: props.onAddItemAtWorld,
    tool: props.tool,
    hasSelection: props.selectedIds.length > 0,
    placeMode: props.treePlacing ? { tool: "tree" as any, keepOpen: true } : null,
    onExitPlaceMode: () => props.setTreePlacing?.(false),
  });

  const zoom = useZoom({
    stageRef,
    stagePos: props.stagePos,
    setStagePos: setStagePosSmart,
    stageScale: props.stageScale,
    setStageScale: props.setStageScale,
    updateSelectionUIRaf: selectionUI.updateSelectionUIRaf,
  });

  useEffect(() => setEditMode("none"), [props.selectedIds.join("|")]);
  useEffect(() => setToolbarOffset(null), [props.selectedIds.join("|")]);

  const clampItemsToPlot = useCallback(
    (nextW: number, nextH: number) => {
      const margin = 10;
      for (const it of props.doc.items) {
        const maxX = Math.max(0, nextW - it.w - margin);
        const maxY = Math.max(0, nextH - it.h - margin);
        const nx = clamp(it.x, margin, maxX);
        const ny = clamp(it.y, margin, maxY);
        if (nx !== it.x || ny !== it.y) props.onUpdateItem(it.id, { x: nx, y: ny });
      }
    },
    [props.doc.items, props.onUpdateItem]
  );

  const commitCanvasSize = useCallback(
    (next: { w: number; h: number }) => {
      const w = Math.max(MIN_PLOT_W, Math.round(next.w));
      const h = Math.max(MIN_PLOT_H, Math.round(next.h));
      props.onUpdateCanvas({ width: w, height: h });
      clampItemsToPlot(w, h);

      // keep camera sane after plot changes (guarded)
      setStagePosSmart(props.stagePos);

      setDraftCanvas(null);
    },
    [clampItemsToPlot, props.onUpdateCanvas, props.stagePos, setStagePosSmart]
  );

  const duplicateSelected = useCallback(() => {
    props.onCopySelected();
    props.onPasteAtCursor();
  }, [props.onCopySelected, props.onPasteAtCursor]);

  const deleteSelected = useCallback(() => props.onDeleteSelected(), [props.onDeleteSelected]);

  const toggleLockSelected = useCallback(() => {
    for (const it of selectedItems) {
      const locked = Boolean(it.meta?.locked);
      props.onUpdateItem(it.id, { meta: { ...it.meta, locked: !locked } });
    }
    selectionUI.updateSelectionUIRaf();
  }, [props.onUpdateItem, selectedItems, selectionUI]);

  const setRadiusSelected = useCallback(
    (radius: number) => {
      for (const it of selectedItems) {
        if (Boolean(it.meta?.locked)) continue;
        if (!isRectLike(it)) continue;
        if (hasBezier(it) || hasCurvature(it) || hasPolygon(it)) continue;
        props.onUpdateItem(it.id, { style: { ...it.style, radius: clamp(radius, 0, 220) } });
      }
      selectionUI.updateSelectionUIRaf();
    },
    [props.onUpdateItem, selectedItems, selectionUI]
  );

  const cycleEditMode = useCallback(() => {
    if (!single) return;
    if (single.meta?.locked) return;
    if (isTree(single)) return;

    if (hasBezier(single)) return setEditMode((m) => (m === "bezier" ? "none" : "bezier"));
    if (hasCurvature(single)) return setEditMode((m) => (m === "curvature" ? "none" : "curvature"));
    if (hasPolygon(single)) return setEditMode((m) => (m === "polygon" ? "none" : "polygon"));
    if (isRectLike(single) && !isPillLike(single))
      return setEditMode((m) => (m === "corners" ? "none" : "corners"));
    setEditMode("none");
  }, [single]);

  const convertSelected = useCallback(
    (kind: "rect" | "polygon" | "curvature" | "bezier") => {
      if (!single) return;
      if (single.meta?.locked) return;

      if (kind === "rect") {
        props.onUpdateItem(single.id, {
          meta: { ...single.meta, polygon: undefined, curvature: undefined, bezier: undefined, cornerRadii: undefined },
        });
        setEditMode("corners");
        selectionUI.updateSelectionUIRaf();
        return;
      }

      if (kind === "polygon") {
        props.onUpdateItem(single.id, {
          meta: { ...single.meta, polygon: single.meta.polygon, curvature: undefined, bezier: undefined, cornerRadii: undefined },
        });
        setEditMode("polygon");
        selectionUI.updateSelectionUIRaf();
        return;
      }

      if (kind === "curvature") {
        props.onUpdateItem(single.id, {
          meta: { ...single.meta, curvature: single.meta.curvature, polygon: undefined, bezier: undefined, cornerRadii: undefined },
        });
        setEditMode("curvature");
        selectionUI.updateSelectionUIRaf();
        return;
      }

      if (kind === "bezier") {
        props.onUpdateItem(single.id, {
          meta: { ...single.meta, bezier: single.meta.bezier, curvature: undefined, polygon: undefined, cornerRadii: undefined },
        });
        setEditMode("bezier");
        selectionUI.updateSelectionUIRaf();
      }
    },
    [props.onUpdateItem, single, selectionUI]
  );

  const curveLabel =
    editMode === "corners"
      ? "Corners"
      : editMode === "polygon"
        ? "Polygon"
        : editMode === "curvature"
          ? "Curvature"
          : editMode === "bezier"
            ? "Bezier"
            : "Edit";

  const canRadius =
    Boolean(single) && isRectLike(single!) && !hasBezier(single!) && !hasCurvature(single!) && !hasPolygon(single!);

  const canConvert = Boolean(single) && !anyLocked && !isSingleTree;
  const canEdit = Boolean(single) && !anyLocked && !isSingleTree;

  const snapStep = props.snapStep ?? 20;
  const showSnapGuides = Boolean(props.snapToGrid) && Boolean(props.cursorWorld);
  const snapped = useMemo(() => {
    if (!showSnapGuides || !props.cursorWorld) return null;
    const round = (v: number) => Math.round(v / snapStep) * snapStep;
    return { x: round(props.cursorWorld.x), y: round(props.cursorWorld.y) };
  }, [showSnapGuides, props.cursorWorld, snapStep]);

  return (
    <section
      ref={wrapRef}
      className="relative h-full w-full"
      style={{
        touchAction: "none",
        cursor: pan.panningRef.current.active ? "grabbing" : cursorRef.current,
      }}
    >
      <PlotControls
        showPlotBoundary={showPlotBoundary}
        setShowPlotBoundary={setShowPlotBoundary}
        editPlot={editPlot}
        setEditPlot={setEditPlot}
        plotW={plotW}
        plotH={plotH}
        stageSize={stageSize}
        stageScale={props.stageScale}
        setStagePos={setStagePosSmart}
        constrainView={constrainView}
        setConstrainView={setConstrainView}
      />

      <PlotHud itemsCount={props.doc.items.length} selectedCount={props.selectedIds.length} />

      {selectionUI.toolbarBox ? (
        <FloatingToolbar
          box={selectionUI.toolbarBox}
          wrapSize={stageSize}
          locked={anyLocked}
          canRadius={canRadius}
          currentRadius={single ? (single.style?.radius ?? 0) : 0}
          editLabel={curveLabel}
          editOn={editMode !== "none"}
          canEdit={canEdit}
          onToggleEdit={cycleEditMode}
          onDuplicate={duplicateSelected}
          onToggleLock={toggleLockSelected}
          onDelete={deleteSelected}
          onSetRadius={setRadiusSelected}
          onConvert={convertSelected}
          canConvert={canConvert}
          offset={toolbarOffset}
          onOffsetChange={setToolbarOffset}
        />
      ) : null}

      <div className="h-full w-full overflow-hidden">
        <Stage
          ref={stageRef}
          width={stageSize.w}
          height={stageSize.h}
          x={props.stagePos.x}
          y={props.stagePos.y}
          scaleX={props.stageScale}
          scaleY={props.stageScale}
          onWheel={zoom.onWheel}
          onMouseDown={pan.onStagePointerDown}
          onMouseMove={pan.onStagePointerMove}
          onMouseUp={pan.onStagePointerUp}
          onTouchStart={pan.onStagePointerDown}
          onTouchMove={(e) => {
            zoom.onTouchMove?.(e);
            pan.onStagePointerMove();
          }}
          onTouchEnd={() => {
            zoom.onTouchEnd?.();
            pan.onStagePointerUp();
          }}
          onTouchCancel={() => {
            zoom.onTouchEnd?.();
            pan.onStagePointerUp();
          }}
          onDblClick={pan.onDblClick}
        >
          <Layer>
            <StageBackground plotW={plotW} plotH={plotH} noiseImg={textures.noiseImg} noiseOffset={textures.noiseOffset} />

            <PlotSurface
              plotW={plotW}
              plotH={plotH}
              showPlotBoundary={showPlotBoundary}
              noiseImg={textures.noiseImg}
              noiseOffset={textures.noiseOffset}
              leafImg={textures.leafImg}
              leafOffset={textures.leafOffset}
              soilImg={textures.soilImg}
            />

            {props.showGrid !== false ? <Grid plotW={plotW} plotH={plotH} stageScale={props.stageScale} /> : null}

            {snapped ? (
              <>
                <Line points={[snapped.x, 0, snapped.x, plotH]} stroke="rgba(111, 102, 255, 0.22)" strokeWidth={1} listening={false} />
                <Line points={[0, snapped.y, plotW, snapped.y]} stroke="rgba(111, 102, 255, 0.22)" strokeWidth={1} listening={false} />
              </>
            ) : null}

            {itemsSorted.map((item) => (
              <ItemNode
                key={item.id}
                item={item}
                selected={props.selectedIds.includes(item.id)}
                locked={Boolean(item.meta?.locked)}
                stageScale={props.stageScale}
                editMode={props.selectedIds.length === 1 ? editMode : "none"}
                isCoarse={isCoarse}
                treeImages={treeImages}
                soilImg={textures.soilImg ?? null}
                panMode={props.panMode}
                setWrapCursor={setWrapCursor}
                onRegister={(node: Konva.Node | null) => {
                  if (node) nodeMapRef.current.set(item.id, node);
                  else nodeMapRef.current.delete(item.id);
                }}
                onSelect={(evt: { shiftKey: boolean }) => {
                  if (!evt.shiftKey) return props.setSelectedIds([item.id]);
                  const set = new Set(props.selectedIds);
                  if (set.has(item.id)) set.delete(item.id);
                  else set.add(item.id);
                  props.setSelectedIds(Array.from(set));
                }}
                onCommit={(patch: Partial<StudioItem>) => {
                  if (Boolean(item.meta?.locked)) return;
                  props.onUpdateItem(item.id, patch);
                  selectionUI.updateSelectionUIRaf();
                }}
                onSelectionUI={selectionUI.updateSelectionUIRaf}
              />
            ))}

            {props.selectedIds.length > 1 ? (
              <Transformer
                ref={trRef}
                rotateEnabled={isSingleTree}
                keepRatio={false}
                padding={6}
                borderStroke="rgba(0,0,0,0)"
                borderStrokeWidth={0}
                anchorSize={9}
                anchorCornerRadius={9}
                anchorStroke="rgba(111, 102, 255, 0.55)"
                anchorStrokeWidth={1.2}
                anchorFill="rgba(255,255,255,0.98)"
                centeredScaling={false}
                onTransform={() => selectionUI.updateSelectionUIRaf()}
                onTransformEnd={() => selectionUI.updateSelectionUIRaf()}
              />
            ) : null}

            {editPlot ? (
              <PlotResizeHandle
                plotW={plotW}
                plotH={plotH}
                minW={MIN_PLOT_W}
                minH={MIN_PLOT_H}
                setDraftCanvas={setDraftCanvas}
                commitCanvasSize={commitCanvasSize}
                setWrapCursor={setWrapCursor}
              />
            ) : null}
          </Layer>
        </Stage>
      </div>
    </section>
  );
}
