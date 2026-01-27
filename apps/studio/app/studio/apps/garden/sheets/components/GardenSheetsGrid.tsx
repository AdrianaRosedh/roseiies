// apps/studio/app/studio/apps/garden/sheets/components/GardenSheetsGrid.tsx
"use client";

import React, { useMemo, useState } from "react";
import { useSyncExternalStore } from "react";
import type { Column, PlantingRow } from "../types";
import { createGridStore } from "../grid/store";
import GridSurface from "../grid/GridSurface";
import EditorOverlay from "../grid/EditorOverlay";
import { ROSEIIES_SHEETS_BUILD } from "../version";

const gridStore = createGridStore();

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export default function GardenSheetsGrid(props: {
  cols: Column[];
  rows: Array<{ id: string; row: PlantingRow | null; isDraft: boolean }>;

  bedsAndTrees: any[];
  zonesForBed: (bedId: string | null) => string[];
  getActiveBedIdForRow: (rowId: string, row: PlantingRow | null) => string | null;

  selectedRowId: string | null;
  onRowClick: (row: PlantingRow | null) => void;

  itemLabel: (id: string | null) => string;
  getCellValue: (rowId: string, colKey: string, row: PlantingRow | null) => any;

  commitCell: (args: {
    rowId: string;
    colKey: string;
    value: any;
    move?: "down" | "right" | "left";
  }) => Promise<void>;

  getRowById: (rowId: string) => PlantingRow | null;

  // ✅ new: enables header “+ column” button (Airtable-style)
  onAddColumn: () => unknown | Promise<unknown>;
}) {
  const {
    cols,
    rows,
    bedsAndTrees,
    zonesForBed,
    getActiveBedIdForRow,
    selectedRowId,
    onRowClick,
    itemLabel,
    getCellValue,
    commitCell,
    getRowById,
    onAddColumn,
  } = props;

  useSyncExternalStore(gridStore.subscribe, gridStore.getState, gridStore.getState);

  const widths = useMemo(() => cols.map((c) => c.width ?? 180), [cols]);
  const gutterW = 44;
  const addColW = 54;

  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  async function commit(args: {
    rowId: string;
    colKey: string;
    value: any;
    move?: "down" | "right" | "left";
  }) {
    setSaveState("saving");
    setSaveMsg(null);

    try {
      await commitCell(args);
      gridStore.endEdit();
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 900);
    } catch (e: any) {
      setSaveState("error");
      setSaveMsg(e?.message ?? "Failed to save");
    }
  }

  async function commitActiveEditIfAny(): Promise<boolean> {
    const snap = gridStore.getState().editing;
    if (!snap) return true;

    setSaveState("saving");
    setSaveMsg(null);

    try {
      await commitCell({
        rowId: snap.cell.rowId,
        colKey: snap.cell.colKey,
        value: snap.value,
      });

      gridStore.endEdit();
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 900);
      return true;
    } catch (e: any) {
      setSaveState("error");
      setSaveMsg(e?.message ?? "Failed to save");
      return false;
    }
  }

  // Focus first editable cell on "__new__" row
  async function focusNewRowFirstCell(el: HTMLDivElement) {
    const ok = await commitActiveEditIfAny();
    if (!ok) return;

    const firstColKey = String(cols[0]?.key ?? "crop");
    const rect = el.getBoundingClientRect();

    gridStore.setActive(true);
    gridStore.select({ rowId: "__new__", colKey: firstColKey });

    requestAnimationFrame(() => {
      gridStore.beginEdit({ rowId: "__new__", colKey: firstColKey }, getCellValue("__new__", firstColKey, null), rect);
    });
  }

  const tableMinWidth = gutterW + widths.reduce((a, b) => a + b, 0) + addColW;

  return (
    <div className="w-full h-full flex flex-col">
      {/* “background surface” (shows through when grid ends) */}
      <div className="flex-1 min-h-0 overflow-auto bg-black/2">
        {/* Grid card (inline, so empty right/bottom shows background) */}
        <div
          className="inline-block align-top bg-white border border-black/10 shadow-[0_1px_0_rgba(0,0,0,0.02)]"
          style={{ minWidth: tableMinWidth }}
        >
          {/* sticky header */}
          <div className="sticky top-0 z-10 flex border-b border-black/10 bg-white/90 backdrop-blur">
            {/* gutter header */}
            <div
              className="shrink-0 border-r border-black/10 bg-black/1"
              style={{ width: gutterW }}
              title="Rows"
            />

            {/* columns */}
            {cols.map((c, i) => {
              const key = String(c.key);
              return (
                <div
                  key={key}
                  className="px-3 py-2 text-xs font-semibold text-black/70 border-r border-black/10 last:border-r-0"
                  style={{ width: widths[i] }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 truncate">{c.label}</div>
                    <div className="text-[10px] font-medium text-black/35 uppercase tracking-wide">
                      {c.type}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* + column (Airtable-style) */}
            <button
              type="button"
              onClick={() => onAddColumn()}
              className={cn(
                "shrink-0 border-l border-black/10 bg-white/70 hover:bg-white",
                "text-xs font-semibold text-black/55 hover:text-black/80",
                "flex items-center justify-center"
              )}
              style={{ width: addColW }}
              title="Add column"
            >
              +
            </button>
          </div>

          <GridSurface
            store={gridStore}
            cols={cols}
            widths={widths}
            rows={rows}
            selectedRowId={selectedRowId}
            itemLabel={itemLabel}
            getCellValue={getCellValue}
            beginEdit={({ rowId, colKey, value, anchorRect }) => {
              gridStore.beginEdit({ rowId, colKey }, value, anchorRect);
            }}
            onRowBackgroundClick={(row) => onRowClick(row)}
            commitActiveEditIfAny={commitActiveEditIfAny}
            onAddRowFocusFirstCell={({ el }) => void focusNewRowFirstCell(el)}
            addColWidth={addColW}
          />
        </div>

        {/* subtle padding so the background reads like Airtable */}
        <div className="h-10" />
      </div>

      <EditorOverlay
        store={gridStore}
        cols={cols}
        bedsAndTrees={bedsAndTrees}
        zonesForBed={zonesForBed}
        getActiveBedIdForRow={getActiveBedIdForRow}
        getCellValue={getCellValue}
        commit={commit}
        getRowById={getRowById}
      />

      {/* footer */}
      <div className="px-4 pb-3 pt-2 flex items-center justify-between gap-4 border-t border-black/10 bg-white/40">
        <div className="text-xs text-black/40">
          Roseiies Sheets Build:{" "}
          <span className="font-medium">{ROSEIIES_SHEETS_BUILD}</span>
        </div>

        <div className="text-xs">
          {saveState === "saving" ? (
            <span className="text-black/50">Saving…</span>
          ) : saveState === "saved" ? (
            <span className="text-black/50">Saved</span>
          ) : saveState === "error" ? (
            <span className="text-red-600">{saveMsg ?? "Failed to save"}</span>
          ) : (
            <span className="text-black/35">Autosave on cell change</span>
          )}
        </div>
      </div>
    </div>
  );
}
