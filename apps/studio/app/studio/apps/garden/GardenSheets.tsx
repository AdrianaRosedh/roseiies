// apps/studio/app/studio/apps/garden/GardenSheets.tsx
"use client";

import { useMemo } from "react";
import type { PortalContext } from "../../../lib/portal/getPortalContext";

import GardenSheetsErrorBoundary from "./sheets/components/GardenSheetsErrorBoundary";
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
      store.state.gardens.find((g: any) => g.id === store.state.activeGardenId) ??
      null,
    [store.state]
  );

  // Legacy selection (Studio store)
  const gardenId = activeGarden?.id ?? null;

  // ✅ IMPORTANT:
  // Studio "garden name" is NOT the DB Area name anymore.
  // DB Area is the physical area: "Garden" (seeded in roseiies.areas).
  // Studio can have "test", "Winter 2026", etc — those are layouts/labels, not areas.
  const areaName = "Garden";

  // Display name in the toolbar can remain the Studio garden name (optional).
  // If you prefer, show the same as areaName. For now: show Studio label.
  const displayGardenName = (activeGarden?.name ?? areaName).trim();

  // We still require an active Studio garden id for sheet cell persistence + UI consistency.
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
      // IMPORTANT: bed_id MUST store the canvas item id (EditorOverlay enforces this)
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

  // Cells are still keyed by legacy gardenId (fine for now)
  const { cell } = useGardenSheetCells({
    tenantId: portal.tenantId,
    gardenId,
  });

  // ✅ Plantings now load by DB Area name ("Garden") via /api/garden-context
  const plantings = usePlantings({
    tenantId: portal.tenantId,
    gardenName: areaName, // yes: hook param is gardenName, but it represents DB areaName now
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

  return (
    <div className="w-full">
      <GardenSheetsToolbar
        gardenName={displayGardenName} // display label (can be "test")
        loading={plantings.loading}
        lastError={plantings.lastError}
        onRefresh={plantings.refresh}
        onAddColumn={addColumn}
        onGoDesign={onGoDesign}
      />

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
  );
}