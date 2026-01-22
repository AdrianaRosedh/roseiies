"use client";

import { useMemo, useState } from "react";
import type { LayoutDoc, StudioModule } from "../types";
import type { PortalContext } from "../../../lib/portal/getPortalContext";

import TopBar from "../TopBar";
import LeftToolbar from "../LeftToolbar";
import Inspector from "../Inspector";
import CanvasStage from "../canvas";

import MobileShell from "./MobileShell";
import type { MobileSheetKind } from "./types";

import PanelHeader from "./rails/PanelHeader";
import CollapsedRail from "./rails/CollapsedRail";

export default function StudioShell(props: {
  module: StudioModule;
  store: any;
  portal: PortalContext;
  onBack?: () => void;
}) {
  const { module, store, portal, onBack } = props;

  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);

  // ✅ Canvas toggles
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const SNAP_STEP = 20;

  // Mobile
  const [mobileSheet, setMobileSheet] = useState<MobileSheetKind>(null);
  const toggleSheet = (k: Exclude<MobileSheetKind, null>) =>
    setMobileSheet((v) => (v === k ? null : k));

  const activeGarden = useMemo(
    () => store.state.gardens.find((g: any) => g.id === store.state.activeGardenId) ?? null,
    [store.state]
  );

  const layoutsForGarden = useMemo(() => {
    if (!store.state.activeGardenId) return [];
    return store.state.layouts
      .filter((l: any) => l.gardenId === store.state.activeGardenId)
      .sort((a: any, b: any) => (a.updatedAt < b.updatedAt ? 1 : -1));
  }, [store.state]);

  const activeLayout = useMemo(
    () => store.state.layouts.find((l: any) => l.id === store.state.activeLayoutId) ?? null,
    [store.state]
  );

  const doc = useMemo(() => {
    const id = store.state.activeLayoutId;
    if (!id) return store.emptyDoc();
    return store.state.docs[id] ?? store.emptyDoc();
  }, [store.state.activeLayoutId, store.state.docs]);

  const LEFT_OPEN_W = 280;
  const RIGHT_OPEN_W = 380;
  const RAIL_W = 22;

  const leftW = leftOpen ? LEFT_OPEN_W : RAIL_W;
  const rightW = rightOpen ? RIGHT_OPEN_W : RAIL_W;

  const canCopy = store.selectedIds.length > 0;
  const canPaste = !!store.clipboard;
  const canDelete = store.selectedIds.length > 0;

  // selection helpers
  const selectedItems = store.selectedItems ?? [];
  const anyLocked = selectedItems.some((it: any) => Boolean(it?.meta?.locked));

  const canDuplicate = store.selectedIds.length > 0;
  const canLock = store.selectedIds.length > 0;
  const canDeleteAction = store.selectedIds.length > 0;
  const canReorder = store.selectedIds.length > 0;

  function onDuplicate() {
    store.copySelected?.();
    store.pasteAtCursor?.();
  }

  function onToggleLock() {
    if (!selectedItems.length) return;
    const nextLocked = !anyLocked;
    selectedItems.forEach((it: any) => {
      store.updateItem?.(it.id, { meta: { ...it.meta, locked: nextLocked } });
    });
  }

  // order helpers
  function bringForward() {
    if (!selectedItems.length) return;
    selectedItems.forEach((it: any) =>
      store.updateItem?.(it.id, { order: (it.order ?? 0) + 1 })
    );
  }
  function sendBackward() {
    if (!selectedItems.length) return;
    selectedItems.forEach((it: any) =>
      store.updateItem?.(it.id, { order: (it.order ?? 0) - 1 })
    );
  }
  function bringToFront() {
    if (!selectedItems.length) return;
    const maxOrder = (doc.items ?? []).reduce(
      (m: number, it: any) => Math.max(m, it.order ?? 0),
      0
    );
    const sorted = [...selectedItems].sort(
      (a: any, b: any) => (a.order ?? 0) - (b.order ?? 0)
    );
    sorted.forEach((it: any, idx: number) =>
      store.updateItem?.(it.id, { order: maxOrder + 1 + idx })
    );
  }
  function sendToBack() {
    if (!selectedItems.length) return;
    const minOrder = (doc.items ?? []).reduce(
      (m: number, it: any) => Math.min(m, it.order ?? 0),
      0
    );
    const sorted = [...selectedItems].sort(
      (a: any, b: any) => (a.order ?? 0) - (b.order ?? 0)
    );
    sorted.forEach((it: any, idx: number) =>
      store.updateItem?.(it.id, { order: minOrder - sorted.length + idx })
    );
  }

  // snap wrapper (canvas commits)
  function updateItemSnapped(id: string, patch: any) {
    if (!snapToGrid) return store.updateItem?.(id, patch);

    const round = (v: number) => Math.round(v / SNAP_STEP) * SNAP_STEP;
    const next = { ...patch };

    if (typeof next.x === "number") next.x = round(next.x);
    if (typeof next.y === "number") next.y = round(next.y);
    if (typeof next.w === "number") next.w = Math.max(1, round(next.w));
    if (typeof next.h === "number") next.h = Math.max(1, round(next.h));

    return store.updateItem?.(id, next);
  }

  const canvasProps = {
    module,
    doc,
    tool: store.tool,
    selectedIds: store.selectedIds,
    setSelectedIds: store.setSelectedIds,
    panMode: store.panMode,
    stageScale: store.stageScale,
    setStageScale: store.setStageScale,
    stagePos: store.stagePos,
    setStagePos: store.setStagePos,
    onAddItemAtWorld: store.addItemAtWorld,
    onUpdateItem: updateItemSnapped,
    onUpdateCanvas: (patch: Partial<LayoutDoc["canvas"]>) =>
      store.updateLayoutDoc({ canvas: { ...doc.canvas, ...patch } }),
    setCursorWorld: store.setCursorWorld,
    setViewportCenterWorld: store.setViewportCenterWorld,
    onCopySelected: store.copySelected,
    onPasteAtCursor: store.pasteAtCursor,
    onDeleteSelected: store.deleteSelected,
    showGrid,
  };

  return (
    <div className="w-full">
      <TopBar
        module={module}
        state={store.state}
        activeGarden={activeGarden}
        layoutsForGarden={layoutsForGarden}
        activeLayout={activeLayout}
        stageScale={store.stageScale}
        panMode={store.panMode}
        onBack={onBack}
        onSetGarden={store.setActiveGarden}
        onSetLayout={store.setActiveLayout}
        onNewGarden={store.newGarden}
        onRenameGarden={store.renameGarden}
        onNewLayout={store.newLayout}
        onRenameLayout={store.renameLayout}
        onPublish={() => store.publishLayout?.(portal.tenantId)}
        onResetView={store.resetView}
        onCopy={store.copySelected}
        onPaste={store.pasteAtCursor}
        onDelete={store.deleteSelected}
        canCopy={canCopy}
        canPaste={canPaste}
        canDelete={canDelete}
        onOpenMobileMore={() => toggleSheet("more")}
        onOpenMobileContext={() => toggleSheet("context")}
      />

      {/* Desktop */}
      <div className="hidden md:flex gap-3 mt-3 min-h-[calc(100vh-56px-56px-28px)]">
        <div className="shrink-0 transition-[width] duration-300 ease-out" style={{ width: leftW }}>
          <div className="h-full rounded-2xl border border-black/10 bg-white/60 shadow-sm backdrop-blur overflow-hidden">
            {leftOpen ? (
              <div className="h-full p-3">
                <PanelHeader title="Tools" side="left" onCollapse={() => setLeftOpen(false)} />
                <div className="pt-2">
                  <LeftToolbar
                    module={module}
                    tool={store.tool}
                    setTool={(t: any) => {
                      store.setTool(t);
                      store.quickInsert(t);
                    }}
                    // Quick actions
                    canDuplicate={canDuplicate}
                    canLock={canLock}
                    canDelete={canDeleteAction}
                    isLockedSelection={anyLocked}
                    onDuplicate={onDuplicate}
                    onToggleLock={onToggleLock}
                    onDelete={store.deleteSelected}
                    // Snap/Grid
                    showGrid={showGrid}
                    setShowGrid={setShowGrid}
                    snapToGrid={snapToGrid}
                    setSnapToGrid={setSnapToGrid}
                    // Layers
                    canReorder={canReorder}
                    onBringForward={bringForward}
                    onSendBackward={sendBackward}
                    onBringToFront={bringToFront}
                    onSendToBack={sendToBack}
                  />
                </div>
              </div>
            ) : (
              <CollapsedRail side="left" title="Tools" onExpand={() => setLeftOpen(true)} />
            )}
          </div>
        </div>

        <div className="flex-1 rounded-2xl border border-black/10 bg-white/40 shadow-sm overflow-hidden relative">
          <CanvasStage {...canvasProps} />
        </div>

        <div className="shrink-0 transition-[width] duration-300 ease-out" style={{ width: rightW }}>
          <div className="h-full rounded-2xl border border-black/10 bg-white/60 shadow-sm backdrop-blur overflow-hidden">
            {rightOpen ? (
              <div className="h-full p-3">
                <PanelHeader title="Inspector" side="right" onCollapse={() => setRightOpen(false)} />
                <div className="pt-2 h-[calc(100%-40px)] overflow-auto">
                  <Inspector
                    module={module}
                    selectedIds={store.selectedIds}
                    selected={store.selected}
                    selectedItems={store.selectedItems}
                    onUpdateItem={store.updateItem}
                    onUpdateMeta={store.updateMeta}
                    onUpdateStyle={store.updateStyle}
                    onAddPlant={store.addPlantToBed}
                    onUpdatePlant={store.updatePlant}
                    onRemovePlant={store.removePlant}
                  />
                </div>
              </div>
            ) : (
              <CollapsedRail side="right" title="Inspector" onExpand={() => setRightOpen(true)} />
            )}
          </div>
        </div>
      </div>

      {/* Mobile (uses shell/mobile/*) */}
      <MobileShell
        module={module}
        store={store}
        portal={portal}
        mobileSheet={mobileSheet}
        setMobileSheet={setMobileSheet}
        toggleSheet={toggleSheet}
        canvasProps={canvasProps}
        activeGarden={activeGarden}
        layoutsForGarden={layoutsForGarden}
        activeLayout={activeLayout}
        canCopy={canCopy}
        canPaste={canPaste}
        canDelete={canDelete}
        canDuplicate={canDuplicate}
        canLock={canLock}
        isLockedSelection={anyLocked}
        onDuplicate={onDuplicate}
        onToggleLock={onToggleLock}
        showGrid={showGrid}
        setShowGrid={setShowGrid}
        snapToGrid={snapToGrid}
        setSnapToGrid={setSnapToGrid}
        canReorder={canReorder}
        onBringForward={bringForward}
        onSendBackward={sendBackward}
        onBringToFront={bringToFront}
        onSendToBack={sendToBack}
      />
    </div>
  );
}