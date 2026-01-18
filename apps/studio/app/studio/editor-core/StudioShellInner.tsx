"use client";

import { useMemo } from "react";
import type { StudioModule } from "./types";
import TopBar from "./TopBar";
import LeftToolbar from "./LeftToolbar";
import Inspector from "./Inspector";
import CanvasStage from "./CanvasStage";

export default function StudioShellInner({
  module,
  store,
}: {
  module: StudioModule;
  store: any; // (keep any for now; we can type it cleanly after)
}) {
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
  }, [store]);

  return (
    <div className="h-[calc(100vh-56px)]">
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
        onPublish={store.publishLayout}
        onResetView={store.resetView}
        onCopy={store.copySelected}
        onPaste={store.pasteAtCursor}
        onDelete={store.deleteSelected}
        canCopy={store.selectedIds.length > 0}
        canPaste={!!store.clipboard}
        canDelete={store.selectedIds.length > 0}
      />

      <div className="grid grid-cols-[280px_1fr_380px] h-[calc(100vh-56px)]">
        <LeftToolbar
          module={module}
          tool={store.tool}
          setTool={(t: any) => {
            store.setTool(t);
            store.quickInsert(t);
          }}
        />

        <div className="h-full w-full">
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
          />
        </div>

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
  );
}
