// apps/studio/app/studio/apps/garden/GardenSheets.tsx
"use client";

import type { PortalContext } from "../../../lib/portal/getPortalContext";

import GardenSheetsErrorBoundary from "./sheets/components/GardenSheetsErrorBoundary";
import GardenSheetsToolbar from "./sheets/components/GardenSheetsToolbar";
import GardenSheetsGrid from "./sheets/components/GardenSheetsGrid";

import { useGardenSheetCells } from "./sheets/hooks/useGardenSheetCells";
import { useGardenSheetColumns } from "./sheets/hooks/useGardenSheetColumns";
import { usePlantings } from "./sheets/hooks/usePlantings";
import { useGardenSheetsModel } from "./sheets/hooks/useGardenSheetsModel";

import type { Column } from "./sheets/types";
import { useMemo } from "react";

export default function GardenSheets({
  store,
  portal,
  onGoDesign,
}: {
  store: any;
  portal: PortalContext;
  onGoDesign?: () => void;
}) {
  // ✅ Hard guard: prevents the crash you’re seeing
  if (!portal || !portal.tenantId) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-black/10 bg-white/70 p-5">
          <div className="text-sm font-semibold text-black/80">
            Sheets can’t load (missing tenant context)
          </div>
          <div className="mt-2 text-sm text-black/60">
            The Garden Sheets view requires <span className="font-medium">portal.tenantId</span>.
            This usually means the Garden App isn’t passing <span className="font-medium">portal</span> into Sheets.
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
    () => store.state.gardens.find((g: any) => g.id === store.state.activeGardenId) ?? null,
    [store.state]
  );

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

  const gardenName = activeGarden?.name ?? null;

  const defaultCols: Column[] = useMemo(
    () => [
      { key: "crop", label: "Crop", type: "text", width: 260 },
      {
        key: "status",
        label: "Status",
        type: "select",
        width: 180,
        options: { values: ["Planned", "Planted", "Growing", "Harvest", "Archived"] },
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
    gardenName,
  });

  const plantings = usePlantings({
    gardenName,
    tenantId: portal.tenantId,
  });

  const model = useGardenSheetsModel({
    store,
    gardenName,
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
        gardenName={gardenName}
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
        editing={model.editing}
        draft={model.draft}
        setDraft={model.setDraft}
        getCellValue={model.getCellValue}
        startEdit={model.startEdit}
        commitEdit={model.commitEdit}
        stopEdit={model.stopEdit}
        selectedRowId={model.selectedRowId}
        onRowClick={model.onRowClick}
        itemLabel={model.itemLabel}
      />
    </div>
  );
}