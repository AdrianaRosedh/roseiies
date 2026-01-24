// apps/studio/app/studio/editor-core/shell/StudioShell.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import type { LayoutDoc, StudioModule, StudioItem } from "../types";
import type { PortalContext } from "../../../lib/portal/getPortalContext";

// ✅ Realtime client (Option A)
import { createBrowserSupabase } from "@roseiies/supabase/browser";

import TopBar from "../TopBar";
import LeftToolbar from "../LeftToolbar";
import Inspector from "../Inspector";
import CanvasStage from "../canvas";

import MobileShell from "./MobileShell";

import PanelHeader from "./desktop/PanelHeader";
import CollapsedRail from "./desktop/CollapsedRail";

export type MobileSheetKind = "context" | "tools" | "inspector" | "more" | null;

type AlignTo = "selection" | "plot";

type PlantingRow = {
  id: string;
  bed_id: string | null;
  zone_code: string | null;
  crop: string | null;
  status: string | null;
  planted_at: string | null;
  pin_x: number | null;
  pin_y: number | null;
};

function boundsOf(items: StudioItem[]) {
  if (!items.length) return { minX: 0, minY: 0, maxX: 0, maxY: 0, w: 0, h: 0 };
  const minX = Math.min(...items.map((i) => i.x));
  const minY = Math.min(...items.map((i) => i.y));
  const maxX = Math.max(...items.map((i) => i.x + i.w));
  const maxY = Math.max(...items.map((i) => i.y + i.h));
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
}

function sanitizePlantingsForDoc(doc: LayoutDoc, plantings: PlantingRow[]) {
  const items = doc?.items ?? [];
  const beds = items.filter((it: any) => it.type === "bed");
  const validItemIds = new Set(items.map((it: any) => it.id));

  const zonesForBed = (bedId: string) => {
    const bed = beds.find((b: any) => b.id === bedId);
    const zones = bed?.meta?.zones;
    if (!Array.isArray(zones)) return [];
    return zones.map((z: any) => String(z?.code ?? "").trim()).filter(Boolean);
  };

  return (plantings ?? [])
    .filter((p) => p && p.bed_id && validItemIds.has(p.bed_id))
    .map((p) => {
      const bedId = p.bed_id as string;
      const allowed = zonesForBed(bedId);

      const z = p.zone_code ? String(p.zone_code).trim() : null;
      const zone_code = z && allowed.includes(z) ? z : null;

      return {
        ...p,
        zone_code,
      };
    });
}

export default function StudioShell(props: {
  module: StudioModule;
  store: any;
  portal: PortalContext;
  onBack?: () => void;
}) {
  const { module, store, portal, onBack } = props;

  // lock viewport scroll
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyHeight = body.style.height;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.height = "100%";

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      body.style.height = prevBodyHeight;
    };
  }, []);

  // ✅ Safety: clear selection when layout changes (prevents stale ids crashing selection UI)
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
    setMobileSheet((v: MobileSheetKind) => (v === k ? null : k));

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

  const canArrange = store.selectedIds.length >= 2 && !anyLocked;
  const canDistribute = store.selectedIds.length >= 3 && !anyLocked;

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

  // snap helper for programmatic ops (do NOT snap trees)
  function snapPatch(id: string, patch: any) {
    const it = (doc.items ?? []).find((x: any) => x.id === id);
    const isTree = it?.type === "tree";
    if (!snapToGrid || isTree) return patch;

    const round = (v: number) => Math.round(v / SNAP_STEP) * SNAP_STEP;
    const next = { ...patch };

    if (typeof next.x === "number") next.x = round(next.x);
    if (typeof next.y === "number") next.y = round(next.y);
    if (typeof next.w === "number") next.w = Math.max(1, round(next.w));
    if (typeof next.h === "number") next.h = Math.max(1, round(next.h));

    return next;
  }

  function bringForward() {
    if (!selectedItems.length) return;
    store.updateItemsBatch?.(
      selectedItems.map((it: any) => ({ id: it.id, patch: { order: (it.order ?? 0) + 1 } }))
    );
  }

  function sendBackward() {
    if (!selectedItems.length) return;
    store.updateItemsBatch?.(
      selectedItems.map((it: any) => ({ id: it.id, patch: { order: (it.order ?? 0) - 1 } }))
    );
  }

  function bringToFront() {
    if (!selectedItems.length) return;

    const maxOrder = (doc.items ?? []).reduce(
      (m: number, it: any) => Math.max(m, it.order ?? 0),
      0
    );
    const sorted = [...selectedItems].sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));

    store.updateItemsBatch?.(
      sorted.map((it: any, idx: number) => ({ id: it.id, patch: { order: maxOrder + 1 + idx } }))
    );
  }

  function sendToBack() {
    if (!selectedItems.length) return;

    const minOrder = (doc.items ?? []).reduce(
      (m: number, it: any) => Math.min(m, it.order ?? 0),
      0
    );
    const sorted = [...selectedItems].sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));

    store.updateItemsBatch?.(
      sorted.map((it: any, idx: number) => ({
        id: it.id,
        patch: { order: minOrder - sorted.length + idx },
      }))
    );
  }

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      if (e.key === "]") {
        e.preventDefault();
        if (e.shiftKey) bringToFront();
        else bringForward();
      }
      if (e.key === "[") {
        e.preventDefault();
        if (e.shiftKey) sendToBack();
        else sendBackward();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedItems, doc.items]);

  function getAlignFrame(): { x: number; y: number; w: number; h: number } | null {
    if (selectedItems.length < 2) return null;

    if (alignTo === "plot") {
      return { x: 0, y: 0, w: doc.canvas.width, h: doc.canvas.height };
    }

    const b = boundsOf(selectedItems);
    return { x: b.minX, y: b.minY, w: b.w, h: b.h };
  }

  function alignSelected(k: "left" | "center" | "right" | "top" | "middle" | "bottom") {
    if (!canArrange) return;
    const frame = getAlignFrame();
    if (!frame) return;

    const { x, y, w, h } = frame;

    const patches: Array<{ id: string; patch: Partial<StudioItem> }> = [];

    selectedItems.forEach((it) => {
      if (it.meta?.locked) return;

      let nx = it.x;
      let ny = it.y;

      if (k === "left") nx = x;
      if (k === "center") nx = x + w / 2 - it.w / 2;
      if (k === "right") nx = x + w - it.w;

      if (k === "top") ny = y;
      if (k === "middle") ny = y + h / 2 - it.h / 2;
      if (k === "bottom") ny = y + h - it.h;

      patches.push({ id: it.id, patch: snapPatch(it.id, { x: nx, y: ny }) });
    });

    store.updateItemsBatch?.(patches);
  }

  function distributeSelected(axis: "x" | "y") {
    if (!canDistribute) return;

    const items = [...selectedItems].filter((it) => !it.meta?.locked);
    if (items.length < 3) return;

    const patches: Array<{ id: string; patch: Partial<StudioItem> }> = [];

    if (axis === "x") {
      const sorted = items.sort((a, b) => a.x - b.x);
      const b = boundsOf(sorted);
      const totalW = sorted.reduce((sum, it) => sum + it.w, 0);
      const gaps = sorted.length - 1;
      const gap = gaps > 0 ? (b.w - totalW) / gaps : 0;

      let cursor = b.minX;
      sorted.forEach((it) => {
        patches.push({ id: it.id, patch: snapPatch(it.id, { x: cursor, y: it.y }) });
        cursor += it.w + gap;
      });

      store.updateItemsBatch?.(patches);
      return;
    }

    const sorted = items.sort((a, b) => a.y - b.y);
    const b = boundsOf(sorted);
    const totalH = sorted.reduce((sum, it) => sum + it.h, 0);
    const gaps = sorted.length - 1;
    const gap = gaps > 0 ? (b.h - totalH) / gaps : 0;

    let cursor = b.minY;
    sorted.forEach((it) => {
      patches.push({ id: it.id, patch: snapPatch(it.id, { x: it.x, y: cursor }) });
      cursor += it.h + gap;
    });

    store.updateItemsBatch?.(patches);
  }

  // ---------------------------------------------------------------------------
  // ✅ Plantings: read-only feed from Sheets (Option A: Supabase Realtime)
  // ---------------------------------------------------------------------------
  const [plantings, setPlantings] = useState<PlantingRow[]>([]);

  async function refreshPlantings(gardenName: string | null) {
    if (!gardenName) {
      setPlantings([]);
      return;
    }
    try {
      const res = await fetch(`/api/plantings?gardenName=${encodeURIComponent(gardenName)}`);
      const text = await res.text();

      let json: any = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        return;
      }

      if (!res.ok) return;

      const raw = Array.isArray(json) ? (json as PlantingRow[]) : [];
      // ✅ sanitize to prevent Konva crashes from invalid bed_id/zone_code
      setPlantings(sanitizePlantingsForDoc(doc, raw));
    } catch {
      // ignore in designer
    }
  }

  // initial fetch / garden switch / doc changes
  useEffect(() => {
    refreshPlantings(activeGarden?.name ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGarden?.name, portal.tenantId, store.state.activeLayoutId]);

  // realtime subscription (tenant-scoped)
  useEffect(() => {
    if (!portal.tenantId) return;

    const supabase = createBrowserSupabase();

    let t: any = null;
    const scheduleRefresh = () => {
      if (t) clearTimeout(t);
      t = setTimeout(() => {
        refreshPlantings(activeGarden?.name ?? null);
      }, 150);
    };

    const channel = supabase
      .channel(`garden_plantings:${portal.tenantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "garden_plantings",
          filter: `tenant_id=eq.${portal.tenantId}`,
        },
        (payload) => {
          console.log("[realtime] garden_plantings change", payload);
          scheduleRefresh();
        }
      )
      .subscribe();

    return () => {
      if (t) clearTimeout(t);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portal.tenantId, activeGarden?.name, store.state.activeLayoutId]);

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
    onUpdateItem: (id: string, patch: any) => store.updateItem?.(id, snapPatch(id, patch)),
    onUpdateCanvas: (patch: Partial<LayoutDoc["canvas"]>) =>
      store.updateLayoutDoc({ canvas: { ...doc.canvas, ...patch } }),
    setCursorWorld: store.setCursorWorld,
    setViewportCenterWorld: store.setViewportCenterWorld,
    onCopySelected: store.copySelected,
    onPasteAtCursor: store.pasteAtCursor,
    onDeleteSelected: store.deleteSelected,

    // Undo / Redo
    onUndo: store.undo,
    onRedo: store.redo,

    showGrid,
    snapToGrid,
    snapStep: SNAP_STEP,
    cursorWorld: store.cursorWorld,

    // lets CanvasStage refresh transformer/toolbar after batch ops
    selectionVersion: store.selectionVersion,

    treePlacing,
    setTreePlacing,

    // ✅ read-only plantings feed for pins (sanitized!)
    plantings,
  };

  const LEFT_OPEN_W = 280;
  const RIGHT_OPEN_W = 380;
  const RAIL_W = 22;
  const leftW = leftOpen ? LEFT_OPEN_W : RAIL_W;
  const rightW = rightOpen ? RIGHT_OPEN_W : RAIL_W;

  return (
    <div className="w-full h-dvh overflow-hidden flex flex-col">
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

      <div className="flex-1 overflow-hidden">
        <div className="hidden md:flex gap-3 mt-3 h-full overflow-hidden px-3 pb-3">
          <div className="shrink-0 transition-[width] duration-300 ease-out" style={{ width: leftW }}>
            <div className="h-full rounded-2xl border border-black/10 bg-white/60 shadow-sm backdrop-blur overflow-hidden">
              {leftOpen ? (
                <div className="h-full p-3 overflow-hidden flex flex-col">
                  <PanelHeader title="Tools" side="left" onCollapse={() => setLeftOpen(false)} />
                  <div className="pt-2 flex-1 overflow-auto">
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
                </div>
              ) : (
                <CollapsedRail side="left" title="Tools" onExpand={() => setLeftOpen(true)} />
              )}
            </div>
          </div>

          <div className="flex-1 rounded-2xl border border-black/10 bg-white/40 shadow-sm overflow-hidden relative">
            <CanvasStage {...(canvasProps as any)} />
          </div>

          <div className="shrink-0 transition-[width] duration-300 ease-out" style={{ width: rightW }}>
            <div className="h-full rounded-2xl border border-black/10 bg-white/60 shadow-sm backdrop-blur overflow-hidden">
              {rightOpen ? (
                <div className="h-full p-3 overflow-hidden flex flex-col">
                  <PanelHeader title="Inspector" side="right" onCollapse={() => setRightOpen(false)} />
                  <div className="pt-2 flex-1 overflow-auto">
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
                </div>
              ) : (
                <CollapsedRail side="right" title="Inspector" onExpand={() => setRightOpen(true)} />
              )}
            </div>
          </div>
        </div>

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