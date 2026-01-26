// apps/studio/app/studio/apps/garden/GardenSheets.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PortalContext } from "../../../lib/portal/getPortalContext";

import GardenSheetsErrorBoundary from "./sheets/components/GardenSheetsErrorBoundary";
import GardenAppHeader from "./components/GardenAppHeader";
import GardenSheetsToolbar from "./sheets/components/GardenSheetsToolbar";
import GardenSheetsGrid from "./sheets/components/GardenSheetsGrid";

import { useGardenSheetCells } from "./sheets/hooks/useGardenSheetCells";
import { useGardenSheetColumns } from "./sheets/hooks/useGardenSheetColumns";
import { usePlantings } from "./sheets/hooks/usePlantings";
import { useGardenSheetsModel } from "./sheets/hooks/useGardenSheetsModel";


import type { Column } from "./sheets/types";

export default function GardenSheets({
  store,
  portal,
  onGoDesign,
}: {
  store: any;
  portal: PortalContext;
  onGoDesign?: () => void;
}) {
  if (!portal || !portal.tenantId) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-black/10 bg-white/70 p-5">
          <div className="text-sm font-semibold text-black/80">
            Sheets can’t load (missing tenant context)
          </div>
          <div className="mt-2 text-sm text-black/60">
            The Garden Sheets view requires{" "}
            <span className="font-medium">portal.tenantId</span>.
          </div>
          {onGoDesign ? (
            <button
              onClick={onGoDesign}
              className="mt-4 rounded-lg border border-black/10 bg-white/60 px-3 py-2 text-sm hover:bg-white/80"
            >
              Back to Map
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <GardenSheetsErrorBoundary>
      <GardenSheetsInner store={store} portal={portal} onGoDesign={onGoDesign} />
    </GardenSheetsErrorBoundary>
  );
}

function GardenSheetsInner({
  store,
  portal,
  onGoDesign,
}: {
  store: any;
  portal: PortalContext;
  onGoDesign?: () => void;
}) {
  const activeGarden = useMemo(
    () =>
      store.state.gardens.find((g: any) => g.id === store.state.activeGardenId) ?? null,
    [store.state]
  );

  // Legacy selection (Studio store)
  const gardenId = activeGarden?.id ?? null;

  // ✅ DB Area is the physical area: "Garden" (seeded in roseiies.areas).
  const areaName = "Garden";

  // Display label can remain the Studio garden name.
  const displayGardenName = (activeGarden?.name ?? areaName).trim();

  if (!gardenId) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-black/10 bg-white/70 p-5">
          <div className="text-sm font-semibold text-black/80">No garden selected</div>
          <div className="mt-2 text-sm text-black/60">
            Select a garden to view its plantings.
          </div>
          {onGoDesign ? (
            <button
              onClick={onGoDesign}
              className="mt-4 rounded-lg border border-black/10 bg-white/60 px-3 py-2 text-sm hover:bg-white/80"
            >
              Back to Map
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  const doc = useMemo(() => {
    const id = store.state.activeLayoutId;
    if (!id) return null;
    return store.state.docs[id] ?? null;
  }, [store.state]);

  const items = useMemo(() => doc?.items ?? [], [doc]);
  const bedsAndTrees = useMemo(
    () => items.filter((it: any) => it.type === "bed" || it.type === "tree"),
    [items]
  );
  const bedsOnly = useMemo(() => items.filter((it: any) => it.type === "bed"), [items]);

  const defaultCols: Column[] = useMemo(
    () => [
      { key: "crop", label: "Crop", type: "text", width: 260 },
      {
        key: "status",
        label: "Status",
        type: "select",
        width: 180,
        options: { values: ["planned", "active", "harvested", "failed", "archived"] },
      },
      { key: "bed_id", label: "Bed / Tree", type: "select", width: 240 },
      { key: "zone_code", label: "Zone", type: "select", width: 160 },
      { key: "planted_at", label: "Planted", type: "date", width: 160 },
      { key: "pin_x", label: "Pin", type: "checkbox", width: 90 },
    ],
    []
  );

  const { cols, addColumn } = useGardenSheetColumns({
    tenantId: portal.tenantId,
    defaultCols,
  });

  const { cell } = useGardenSheetCells({
    tenantId: portal.tenantId,
    gardenId,
  });

  const plantings = usePlantings({
    tenantId: portal.tenantId,
    gardenName: areaName,
  });

  const model = useGardenSheetsModel({
    store,
    gardenId,
    rows: plantings.rows,
    setRows: (fn) => plantings.setRows(fn),
    cols,
    cell,
    create: plantings.create,
    patch: plantings.patch,
    bedsAndTrees,
    bedsOnly,
  });

  /* -------------------------------------------------------
     Airtable-like delete UX (soft delete + toast undo)
  ------------------------------------------------------- */

  const [undoToast, setUndoToast] = useState<{ id: string } | null>(null);
  const undoTimerRef = useRef<number | null>(null);

  const showUndo = (id: string) => {
    setUndoToast({ id });
    if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current);
    undoTimerRef.current = window.setTimeout(() => setUndoToast(null), 5000);
  };

  const doDelete = (rowId: string) => {
    plantings.softDelete(rowId);
    showUndo(rowId);
  };

  const doUndo = (rowId: string) => {
    plantings.restore(rowId);
    setUndoToast(null);
    if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current);
    undoTimerRef.current = null;
  };

  // Toolbar delete handler (TS-safe)
  const onDeleteSelected = useMemo(() => {
    const id = model.selectedRowId;
    if (!id) return undefined;
    return () => doDelete(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model.selectedRowId]);

  // Keyboard shortcuts: Delete/Backspace => delete selected row; Cmd/Ctrl+Z => undo toast
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName?.toLowerCase();
      const isTyping = tag === "input" || tag === "textarea" || el?.isContentEditable;
      if (isTyping) return;

      if (e.key === "Delete" || e.key === "Backspace") {
        const rowId = model.selectedRowId;
        if (!rowId) return;

        e.preventDefault();
        e.stopPropagation();
        doDelete(rowId);
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        const id = undoToast?.id;
        if (!id) return;

        e.preventDefault();
        e.stopPropagation();
        doUndo(id);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [model.selectedRowId, undoToast?.id]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current);
    };
  }, []);

  return (
    <div className="w-full h-dvh overflow-hidden flex flex-col">
      {/* header (your GardenAppHeader or toolbar) */}
      <GardenAppHeader
        sectionLabel={displayGardenName}
        viewLabel="Sheets"
        statusLine={
          plantings.lastError ? (
            <span className="text-rose-700/80">{plantings.lastError}</span>
          ) : null
        }
        subLeft={
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-lg border border-black/10 bg-white/70 px-3 py-2 text-sm hover:bg-white"
              title="View"
            >
              Main view ▾
            </button>
        
            <div className="hidden lg:flex items-center gap-2 text-xs text-black/45">
              <span>Plantings</span>
            </div>
          </div>
        }
        subRight={
          <GardenSheetsToolbar
            loading={plantings.loading}
            lastError={plantings.lastError}
            onRefresh={plantings.refresh}
            onAddColumn={addColumn}
            onGoDesign={onGoDesign}
            onDeleteSelected={onDeleteSelected}
          />
        }
      />
      
      {/* ✅ match Map shell spacing + framing */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="hidden md:flex gap-3 h-full overflow-hidden px-3 pb-3">
          <div className="flex-1 rounded-2xl border border-black/10 bg-white/40 shadow-sm overflow-hidden">
            <GardenSheetsGrid
              cols={cols}
              rows={model.displayRows}
              bedsAndTrees={bedsAndTrees}
              zonesForBed={model.zonesForBed}
              getActiveBedIdForRow={model.getActiveBedIdForRow}
              selectedRowId={model.selectedRowId}
              onRowClick={model.onRowClick}
              itemLabel={model.itemLabel}
              getCellValue={model.getCellValue}
              commitCell={model.commitCell}
              getRowById={model.getRowById}
            />
          </div>
        </div>

        {/* optional: mobile can stay simple for now */}
        <div className="md:hidden">
          <GardenSheetsGrid
            cols={cols}
            rows={model.displayRows}
            bedsAndTrees={bedsAndTrees}
            zonesForBed={model.zonesForBed}
            getActiveBedIdForRow={model.getActiveBedIdForRow}
            selectedRowId={model.selectedRowId}
            onRowClick={model.onRowClick}
            itemLabel={model.itemLabel}
            getCellValue={model.getCellValue}
            commitCell={model.commitCell}
            getRowById={model.getRowById}
          />
        </div>
      </div>

      {/* keep your undo toast as-is */}
    </div>
  );
}
