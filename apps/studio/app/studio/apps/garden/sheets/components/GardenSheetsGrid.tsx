"use client";

import React, { useMemo, useState } from "react";
import { useSyncExternalStore } from "react";
import type { Column, PlantingRow } from "../types";
import { createGridStore } from "../grid/store";
import GridSurface from "../grid/GridSurface";
import EditorOverlay from "../grid/EditorOverlay";
import { ROSEIIES_SHEETS_BUILD } from "../version";

// store singleton per mount (fine for now)
const gridStore = createGridStore();

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
  } = props;

  // subscribe so overlay re-renders when store changes
  useSyncExternalStore(gridStore.subscribe, gridStore.getState, gridStore.getState);

  const widths = useMemo(() => cols.map((c) => c.width ?? 180), [cols]);

  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
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
      // keep editor open if commit fails
      setSaveState("error");
      setSaveMsg(e?.message ?? "Failed to save");
    }
  }

  // ✅ Airtable behavior: commit the active edit before switching to a new cell
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

  return (
    <div className="w-full h-full flex flex-col">
      {/* ✅ Scroll area fills the card (removes the “empty spacing” look) */}
      <div className="flex-1 min-h-0 overflow-auto">
        {/* sticky header (Airtable feel) */}
        <div className="sticky top-0 z-10 flex border-b border-black/10 bg-white/90 backdrop-blur">
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
        />
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

      {/* footer pinned to bottom of card (no extra “page spacing”) */}
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
