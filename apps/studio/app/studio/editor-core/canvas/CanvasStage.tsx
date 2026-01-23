"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Layer, Stage, Transformer, Line } from "react-konva";
import type Konva from "konva";

import type { LayoutDoc, StudioItem, StudioModule, ItemType } from "../types";

import useStageSize from "./hooks/useStageSize";
import useIsCoarsePointer from "./hooks/useIsCoarsePointer";
import { useSelectionUIBox } from "./hooks/useSelectionUIBox";
import { usePan } from "./hooks/usePan";
import { useZoom } from "./hooks/useZoom";
import { useTextures } from "./hooks/useTextures";
import useTreeImages from "./hooks/useTreeImages";

import { useCanvasCamera } from "./hooks/useCanvasCamera";
import { useCanvasShortcuts } from "./hooks/useCanvasShortcuts";
import { useItemsIndex } from "./hooks/useItemsIndex";

import PlotControls from "./components/PlotControls";
import PlotHud from "./components/PlotHud";
import StageBackground from "./components/StageBackground";
import PlotSurface from "./components/PlotSurface";
import Grid from "./components/Grid";
import PlotResizeHandle from "./components/PlotResizeHandle";
import FloatingToolbar from "./components/FloatingToolbar/FloatingToolbar";

import ItemNode from "./item/ItemNode";

type EditMode = "none" | "corners" | "polygon" | "curvature" | "bezier";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
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

  // ✅ NEW: history (wire these from store for Cmd+Z to work)
  onUndo?: () => void;
  onRedo?: () => void;

  showGrid?: boolean;

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

  // B) items index
  const idx = useItemsIndex({ doc: props.doc, selectedIds: props.selectedIds });
  const { itemsSorted, selectedSet, selectedItems, single, anyLocked, isSingleTree } = idx;

  // assets
  const treeImages = useTreeImages();
  const textures = useTextures({ stagePos: props.stagePos });

  // A) camera (uses stageRef to prevent zoom snapping)
  const camera = useCanvasCamera({
    stageRef,
    stageSize,
    stagePos: props.stagePos,
    setStagePos: props.setStagePos,
    stageScale: props.stageScale,
    setStageScale: props.setStageScale,
    plotW,
    plotH,
    constrainView,
  });

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

  // cursor management
  const cursorRef = useRef<string>("default");
  const setWrapCursor = useCallback((cursor: string) => {
    cursorRef.current = cursor;
    if (wrapRef.current) wrapRef.current.style.cursor = cursor;
  }, []);

  // keep viewport center updated
  useEffect(() => {
    props.setViewportCenterWorld(
      camera.worldFromScreen({ x: stageSize.w / 2, y: stageSize.h / 2 })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageSize.w, stageSize.h, props.stagePos.x, props.stagePos.y, props.stageScale]);

  // reset edit state when selection changes
  useEffect(() => setEditMode("none"), [props.selectedIds.join("|")]);
  useEffect(() => setToolbarOffset(null), [props.selectedIds.join("|")]);

  // shortcuts
  useCanvasShortcuts({
    enabled: true,

    zoomTo100: camera.zoomTo100,
    fitPlotToViewport: camera.fitPlotToViewport,
    zoomToSelection: camera.zoomToSelection,
    selectedItems,

    undo: props.onUndo,
    redo: props.onRedo,

    copy: props.onCopySelected,
    paste: props.onPasteAtCursor,
    duplicate: () => {
      props.onCopySelected();
      props.onPasteAtCursor();
    },
    delete: props.onDeleteSelected,

    selectAll: () => props.setSelectedIds(props.doc.items.map((i) => i.id)),

    clearSelection: () => props.setSelectedIds([]),
    exitPlaceMode: () => props.setTreePlacing?.(false),
    exitEditMode: () => setEditMode("none"),
  });

  // pan + zoom
  const pan = usePan({
    stageRef,
    panMode: props.panMode,
    stagePos: props.stagePos,
    setStagePos: camera.setStagePosSmart,
    stageScale: props.stageScale,
    setSelectedIds: props.setSelectedIds,
    setToolbarBox: selectionUI.setToolbarBox,
    setWrapCursor,
    cursorRef,
    setCursorWorld: props.setCursorWorld,
    updateSelectionUIRaf: selectionUI.updateSelectionUIRaf,
    worldFromScreen: camera.worldFromScreen,
    onAddItemAtWorld: props.onAddItemAtWorld,
    tool: props.tool,
    hasSelection: props.selectedIds.length > 0,
    placeMode: props.treePlacing ? { tool: "tree" as any, keepOpen: true } : null,
    onExitPlaceMode: () => props.setTreePlacing?.(false),
  });

  const zoom = useZoom({
    stageRef,
    stagePos: props.stagePos,
    setStagePos: camera.setStagePosSmart,
    stageScale: props.stageScale,
    setStageScale: props.setStageScale,
    updateSelectionUIRaf: selectionUI.updateSelectionUIRaf,
    hasSelection: props.selectedIds.length > 0,
  });

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

      camera.setStagePosSmart(props.stagePos);
      setDraftCanvas(null);
    },
    [clampItemsToPlot, props.onUpdateCanvas, camera, props.stagePos]
  );

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
        setStagePos={camera.setStagePosSmart}
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
          onDuplicate={() => {
            props.onCopySelected();
            props.onPasteAtCursor();
          }}
          onToggleLock={toggleLockSelected}
          onDelete={props.onDeleteSelected}
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
          <Layer listening={false} perfectDrawEnabled={false}>
            <StageBackground
              plotW={plotW}
              plotH={plotH}
              noiseImg={textures.noiseImg}
              noiseOffset={textures.noiseOffset}
              stagePos={props.stagePos}
              stageScale={props.stageScale}
              stageSize={stageSize}
            />
          </Layer>

          <Layer listening={false} perfectDrawEnabled={false}>
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
          </Layer>

          <Layer>
            {itemsSorted.map((item) => (
              <ItemNode
                key={item.id}
                item={item}
                selected={selectedSet.has(item.id)}
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
          </Layer>

          <Layer>
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
