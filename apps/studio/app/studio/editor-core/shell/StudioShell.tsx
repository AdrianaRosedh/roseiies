// apps/studio/app/studio/editor-core/shell/StudioShell.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { LayoutDoc, StudioModule, StudioItem } from "../types";
import type { PortalContext } from "../../../lib/portal/getPortalContext";

import LeftToolbar from "../LeftToolbar";
import Inspector from "../Inspector";
import CanvasStage from "../canvas";
import MobileShell from "./MobileShell";

import PanelHeader from "./desktop/PanelHeader";
import CollapsedRail from "./desktop/CollapsedRail";

import GardenAppHeader from "../../apps/garden/components/GardenAppHeader";
import GardenMapToolbar from "../../apps/garden/components/GardenMapToolbar";

import AppSectionToolbar from "./components/AppSectionToolbar";

import { useViewportLock } from "./hooks/useViewportLock";
import { useRoseiiesPlantings } from "./hooks/useRoseiiesPlantings";
import { useArrangeTools, type AlignTo } from "./hooks/useArrangeTools";

export type MobileSheetKind = "context" | "tools" | "inspector" | "more" | null;

export default function StudioShell(props: {
  module: StudioModule;
  store: any;
  portal: PortalContext;
  onBack?: () => void;
}) {
  const { module, store, portal, onBack } = props;

  useViewportLock(true);

  // clear selection when layout changes
  useEffect(() => {
    try {
      store?.setSelectedIds?.([]);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store?.state?.activeLayoutId]);

  // tool placement state
  const [treePlacing, setTreePlacing] = useState(false);
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && treePlacing) setTreePlacing(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [treePlacing]);

  // panel UI
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);

  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const SNAP_STEP = 20;

  const [alignTo, setAlignTo] = useState<AlignTo>("selection");

  // mobile
  const [mobileSheet, setMobileSheet] = useState<MobileSheetKind>(null);
  const toggleSheet = (k: Exclude<MobileSheetKind, null>) =>
    setMobileSheet((v) => (v === k ? null : k));

  // active garden/layout/doc
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

  const doc: LayoutDoc = useMemo(() => {
    const id = store.state.activeLayoutId;
    if (!id) return store.emptyDoc();
    return store.state.docs[id] ?? store.emptyDoc();
  }, [store.state.activeLayoutId, store.state.docs]);

  // capabilities
  const canCopy = store.selectedIds.length > 0;
  const canPaste = !!store.clipboard;
  const canDelete = store.selectedIds.length > 0;

  const selectedItems: StudioItem[] = store.selectedItems ?? [];
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
    const patches = selectedItems.map((it: any) => ({
      id: it.id,
      patch: { meta: { ...it.meta, locked: nextLocked } },
    }));
    store.updateItemsBatch?.(patches);
  }

  // plantings feed
  const { plantings } = useRoseiiesPlantings({
    doc,
    portal,
    activeLayoutId: store?.state?.activeLayoutId ?? null,
    areaName: "Garden",
    workplaceSlug: "olivea",
  });

  // arrange tools
  const {
    canArrange,
    canDistribute,
    bringForward,
    sendBackward,
    bringToFront,
    sendToBack,
    alignSelected,
    distributeSelected,
  } = useArrangeTools({
    doc,
    store,
    selectedItems,
    anyLocked,
    alignTo,
    snapToGrid,
    snapStep: SNAP_STEP,
  });

  // CanvasStage props
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
    onUpdateItem: (id: string, patch: any) => store.updateItem?.(id, patch),
    onUpdateCanvas: (patch: Partial<LayoutDoc["canvas"]>) =>
      store.updateLayoutDoc({ canvas: { ...doc.canvas, ...patch } }),
    setCursorWorld: store.setCursorWorld,
    setViewportCenterWorld: store.setViewportCenterWorld,
    onCopySelected: store.copySelected,
    onPasteAtCursor: store.pasteAtCursor,
    onDeleteSelected: store.deleteSelected,
    onUndo: store.undo,
    onRedo: store.redo,
    showGrid,
    snapToGrid,
    snapStep: SNAP_STEP,
    cursorWorld: store.cursorWorld,
    selectionVersion: store.selectionVersion,
    treePlacing,
    setTreePlacing,
    plantings,
  };

  const LEFT_OPEN_W = 280;
  const RIGHT_OPEN_W = 380;
  const RAIL_W = 22;
  const leftW = leftOpen ? LEFT_OPEN_W : RAIL_W;
  const rightW = rightOpen ? RIGHT_OPEN_W : RAIL_W;

  // ✅ TypeScript-safe spring transition for your framer-motion version
  const spring = {
    type: "spring" as const,
    stiffness: 520,
    damping: 42,
    mass: 0.7,
  };

  return (
    <div className="w-full h-dvh overflow-hidden flex flex-col">
      {/* Shared Garden topbar */}
      <GardenAppHeader
        sectionLabel={null}
        viewLabel="Map"
        onGoWorkplace={onBack}
        subLeft={
          <GardenMapToolbar
            state={store.state}
            activeGarden={activeGarden}
            layoutsForGarden={layoutsForGarden}
            activeLayout={activeLayout}
            onBack={onBack}
            onSetGarden={(id: string) => store.setActiveGardenId?.(id)}
            onSetLayout={(id: string) => store.setActiveLayoutId?.(id)}
          />
        }
        subRight={
          <AppSectionToolbar
            actions={[
              {
                kind: "button",
                label: activeLayout?.published ? "Publish ●" : "Publish",
                onClick: () => store.publishActiveLayout?.({ portal }),
                tone: "primary",
                disabled: !activeLayout,
                title: "Publish this layout",
              },

              { kind: "separator" },

              {
                kind: "node",
                node: (
                  <span
                    className="rounded-full border border-black/10 bg-white px-3 py-2 text-xs text-black/70 shadow-sm"
                    title="Zoom"
                  >
                    Zoom: {Math.round((store.stageScale ?? 1) * 100)}%
                  </span>
                ),
              },

              { kind: "button", label: "Reset", onClick: () => store.resetView?.(), tone: "ghost" },

              { kind: "separator" },

              { kind: "button", label: "Copy", onClick: () => store.copySelected?.(), tone: "ghost", disabled: !canCopy },
              { kind: "button", label: "Paste", onClick: () => store.pasteAtCursor?.(), tone: "ghost", disabled: !canPaste },
              { kind: "button", label: "Delete", onClick: () => store.deleteSelected?.(), tone: "danger", disabled: !canDelete },
            ]}
          />
        }
      />

      <div className="flex-1 overflow-hidden">
        {/* Desktop */}
        <div className="hidden md:flex gap-3 mt-3 h-full overflow-hidden px-3 pb-3">
          {/* Left */}
          <div className="shrink-0 transition-[width] duration-300 ease-out" style={{ width: leftW }}>
            <div className="h-full rounded-2xl border border-black/10 bg-white/60 shadow-sm backdrop-blur overflow-hidden">
              <AnimatePresence initial={false} mode="wait">
                {leftOpen ? (
                  <motion.div
                    key="left-open"
                    className="h-full p-3 overflow-hidden flex flex-col"
                    initial={{ opacity: 0, x: -8, filter: "blur(8px)" }}
                    animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, x: -8, filter: "blur(8px)" }}
                    transition={spring}
                  >
                    <PanelHeader title="Tools" side="left" onCollapse={() => setLeftOpen(false)} />
                    <div className="pt-2 flex-1 overflow-y-auto no-scrollbar overscroll-contain">
                      <LeftToolbar
                        module={module}
                        tool={store.tool}
                        setTool={(t: any) => {
                          if (t !== "tree") setTreePlacing(false);
                          store.setTool(t);
                        }}
                        quickInsert={(t: any) => store.quickInsert?.(t)}
                        treeVariant={store.treeVariant}
                        setTreeVariant={store.setTreeVariant}
                        treePlacing={treePlacing}
                        setTreePlacing={setTreePlacing}
                        canDuplicate={canDuplicate}
                        canLock={canLock}
                        canDelete={canDeleteAction}
                        isLockedSelection={anyLocked}
                        onDuplicate={onDuplicate}
                        onToggleLock={onToggleLock}
                        onDelete={store.deleteSelected}
                        showGrid={showGrid}
                        setShowGrid={setShowGrid}
                        snapToGrid={snapToGrid}
                        setSnapToGrid={setSnapToGrid}
                        canReorder={canReorder}
                        onBringForward={bringForward}
                        onSendBackward={sendBackward}
                        onBringToFront={bringToFront}
                        onSendToBack={sendToBack}
                        canArrange={canArrange}
                        canDistribute={canDistribute}
                        alignTo={alignTo}
                        setAlignTo={setAlignTo}
                        onAlign={alignSelected}
                        onDistribute={distributeSelected}
                      />
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="left-rail"
                    className="h-full"
                    initial={{ opacity: 0, x: -8, filter: "blur(8px)" }}
                    animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, x: -8, filter: "blur(8px)" }}
                    transition={spring}
                  >
                    <CollapsedRail side="left" title="Tools" onExpand={() => setLeftOpen(true)} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Canvas */}
          <div className="flex-1 rounded-2xl border border-black/10 bg-white/40 shadow-sm overflow-hidden relative">
            <CanvasStage {...(canvasProps as any)} />
          </div>

          {/* Right */}
          <div className="shrink-0 transition-[width] duration-300 ease-out" style={{ width: rightW }}>
            <div className="h-full rounded-2xl border border-black/10 bg-white/60 shadow-sm backdrop-blur overflow-hidden">
              <AnimatePresence initial={false} mode="wait">
                {rightOpen ? (
                  <motion.div
                    key="right-open"
                    className="h-full p-3 overflow-hidden flex flex-col"
                    initial={{ opacity: 0, x: 8, filter: "blur(8px)" }}
                    animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, x: 8, filter: "blur(8px)" }}
                    transition={spring}
                  >
                    <PanelHeader title="Inspector" side="right" onCollapse={() => setRightOpen(false)} />
                    <div className="pt-2 flex-1 overflow-y-auto no-scrollbar overscroll-contain">
                      <Inspector
                        module={module}
                        selectedIds={store.selectedIds}
                        selected={store.selected}
                        selectedItems={store.selectedItems}
                        onUpdateItem={store.updateItem}
                        onUpdateMeta={store.updateMeta}
                        onUpdateStyle={store.updateStyle}
                        plantings={plantings}
                      />
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="right-rail"
                    className="h-full"
                    initial={{ opacity: 0, x: 8, filter: "blur(8px)" }}
                    animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, x: 8, filter: "blur(8px)" }}
                    transition={spring}
                  >
                    <CollapsedRail side="right" title="Inspector" onExpand={() => setRightOpen(true)} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Mobile (single instance only) */}
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
    </div>
  );
}
