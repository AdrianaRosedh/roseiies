"use client";

import { useMemo, useState } from "react";
import type { StudioModule } from "./types";
import type { PortalContext } from "../../lib/portal/getPortalContext";
import TopBar from "./TopBar";
import LeftToolbar from "./LeftToolbar";
import Inspector from "./Inspector";
import CanvasStage from "./CanvasStage";

export default function StudioShellInner({
  module,
  store,
  portal,
}: {
  module: StudioModule;
  store: any;
  portal: PortalContext;
}) {
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);

  const activeGarden = useMemo(
    () =>
      store.state.gardens.find((g: any) => g.id === store.state.activeGardenId) ??
      null,
    [store.state]
  );

  const layoutsForGarden = useMemo(() => {
    if (!store.state.activeGardenId) return [];
    return store.state.layouts
      .filter((l: any) => l.gardenId === store.state.activeGardenId)
      .sort((a: any, b: any) => (a.updatedAt < b.updatedAt ? 1 : -1));
  }, [store.state]);

  const activeLayout = useMemo(
    () =>
      store.state.layouts.find((l: any) => l.id === store.state.activeLayoutId) ??
      null,
    [store.state]
  );

  const doc = useMemo(() => {
    const id = store.state.activeLayoutId;
    if (!id) return store.emptyDoc();
    return store.state.docs[id] ?? store.emptyDoc();
  }, [store]);

  const LEFT_OPEN_W = 280;
  const RIGHT_OPEN_W = 380;

  // ✅ thinner rails
  const RAIL_W = 22;

  const leftW = leftOpen ? LEFT_OPEN_W : RAIL_W;
  const rightW = rightOpen ? RIGHT_OPEN_W : RAIL_W;

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
        canCopy={store.selectedIds.length > 0}
        canPaste={!!store.clipboard}
        canDelete={store.selectedIds.length > 0}
      />

      {/* Desktop: smooth width animation + center truly resizes */}
      <div className="hidden md:flex gap-3 mt-3 min-h-[calc(100vh-56px-56px-28px)]">
        {/* LEFT */}
        <div
          className="shrink-0 transition-[width] duration-300 ease-out"
          style={{ width: leftW }}
        >
          <div className="h-full rounded-2xl border border-black/10 bg-white/60 shadow-sm backdrop-blur overflow-hidden">
            {leftOpen ? (
              <div className="h-full p-3">
                <PanelHeader
                  title="Tools"
                  side="left"
                  onCollapse={() => setLeftOpen(false)}
                />
                <div className="pt-2">
                  <LeftToolbar
                    module={module}
                    tool={store.tool}
                    setTool={(t: any) => {
                      store.setTool(t);
                      store.quickInsert(t);
                    }}
                  />
                </div>
              </div>
            ) : (
              <CollapsedRail
                side="left"
                title="Tools"
                onExpand={() => setLeftOpen(true)}
              />
            )}
          </div>
        </div>

        {/* CENTER */}
        <div className="flex-1 rounded-2xl border border-black/10 bg-white/40 shadow-sm overflow-hidden relative">
          <CanvasStage
            module={module}
            doc={doc}
            tool={store.tool}
            selectedIds={store.selectedIds}
            setSelectedIds={store.setSelectedIds}
            panMode={store.panMode}
            stageScale={store.stageScale}
            setStageScale={store.setStageScale}
            stagePos={store.stagePos}
            setStagePos={store.setStagePos}
            onAddItemAtWorld={store.addItemAtWorld}
            onUpdateItem={store.updateItem}
            setCursorWorld={store.setCursorWorld}
            setViewportCenterWorld={store.setViewportCenterWorld}
            onCopySelected={store.copySelected}
            onPasteAtCursor={store.pasteAtCursor}
            onDeleteSelected={store.deleteSelected}
          />
        </div>

        {/* RIGHT */}
        <div
          className="shrink-0 transition-[width] duration-300 ease-out"
          style={{ width: rightW }}
        >
          <div className="h-full rounded-2xl border border-black/10 bg-white/60 shadow-sm backdrop-blur overflow-hidden">
            {rightOpen ? (
              <div className="h-full p-3">
                <PanelHeader
                  title="Inspector"
                  side="right"
                  onCollapse={() => setRightOpen(false)}
                />
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
              <CollapsedRail
                side="right"
                title="Inspector"
                onExpand={() => setRightOpen(true)}
              />
            )}
          </div>
        </div>
      </div>

      {/* Mobile: keep your drawer approach (unchanged) */}
      <div className="md:hidden mt-3 rounded-2xl border border-black/10 bg-white/40 shadow-sm overflow-hidden h-[calc(100vh-56px-56px-28px)] relative">
        <CanvasStage
          module={module}
          doc={doc}
          tool={store.tool}
          selectedIds={store.selectedIds}
          setSelectedIds={store.setSelectedIds}
          panMode={store.panMode}
          stageScale={store.stageScale}
          setStageScale={store.setStageScale}
          stagePos={store.stagePos}
          setStagePos={store.setStagePos}
          onAddItemAtWorld={store.addItemAtWorld}
          onUpdateItem={store.updateItem}
          setCursorWorld={store.setCursorWorld}
          setViewportCenterWorld={store.setViewportCenterWorld}
          onCopySelected={store.copySelected}
          onPasteAtCursor={store.pasteAtCursor}
          onDeleteSelected={store.deleteSelected}
        />
      </div>
    </div>
  );
}

function PanelHeader({
  title,
  side,
  onCollapse,
}: {
  title: string;
  side: "left" | "right";
  onCollapse: () => void;
}) {
  const Icon = side === "left" ? IconChevronLeft : IconChevronRight;

  return (
    <div className="flex items-center justify-between">
      <div className="text-sm font-semibold text-black/85">{title}</div>
      <button
        onClick={onCollapse}
        className="inline-flex items-center justify-center rounded-lg border border-black/10 bg-white/80 px-2.5 py-2 text-xs shadow-sm hover:bg-white"
        title="Collapse"
        aria-label="Collapse"
      >
        <Icon />
      </button>
    </div>
  );
}

/**
 * ✅ Collapsed rail:
 * - very thin
 * - NO circle/background around icon
 * - keeps vertical title
 * - click anywhere in rail to expand
 */
function CollapsedRail({
  side,
  title,
  onExpand,
}: {
  side: "left" | "right";
  title: string;
  onExpand: () => void;
}) {
  const Icon = side === "left" ? IconChevronRight : IconChevronLeft;

  return (
    <button
      onClick={onExpand}
      className="h-full w-full flex flex-col items-center justify-center gap-2 hover:bg-black/2 transition-colors"
      title={`Show ${title}`}
      aria-label={`Show ${title}`}
      type="button"
    >
      {/* icon only (no pill) */}
      <span className="opacity-70 hover:opacity-95 transition-opacity">
        <Icon />
      </span>

      {/* vertical title */}
      <span
        className="text-[10px] text-black/35 tracking-wide select-none"
        style={{
          writingMode: "vertical-rl",
          transform: "rotate(180deg)",
        }}
      >
        {title}
      </span>
    </button>
  );
}

function IconChevronLeft() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M12.5 4.5L7.5 10l5 5.5"
        stroke="rgba(15,23,42,0.7)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconChevronRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M7.5 4.5L12.5 10l-5 5.5"
        stroke="rgba(15,23,42,0.7)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}