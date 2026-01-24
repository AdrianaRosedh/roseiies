// apps/studio/app/studio/apps/garden/sheets/grid/GridSurface.tsx
"use client";

import React, { useRef } from "react";
import type { Column, PlantingRow } from "../types";
import type { GridStore } from "./store";
import { pillClass } from "../types";

export default function GridSurface(props: {
  store: GridStore;
  cols: Column[];
  widths: number[];
  rows: Array<{ id: string; row: PlantingRow | null; isDraft: boolean }>;
  selectedRowId: string | null;

  itemLabel: (id: string | null) => string;
  getCellValue: (rowId: string, colKey: string, row: PlantingRow | null) => any;

  beginEdit: (args: { rowId: string; colKey: string; value: any; anchorRect: DOMRect | null }) => void;
  onRowBackgroundClick: (row: PlantingRow | null) => void;

  // commit current edit before switching
  commitActiveEditIfAny: () => Promise<boolean>;
}) {
  const {
    store,
    cols,
    widths,
    rows,
    selectedRowId,
    itemLabel,
    getCellValue,
    beginEdit,
    onRowBackgroundClick,
    commitActiveEditIfAny,
  } = props;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const selected = store.getState().selected;

  function renderDisplay(rowId: string, col: Column, row: PlantingRow | null) {
    const key = String(col.key);

    if (key === "bed_id") {
      const raw =
        rowId === "__new__"
          ? (getCellValue("__new__", "bed_id", null) ?? null)
          : row?.bed_id ?? null;
      const txt = raw ? itemLabel(raw) : "";
      return txt ? <span className="text-black/80 truncate">{txt}</span> : <span className="text-black/30">—</span>;
    }

    const v = getCellValue(rowId, key, row);

    if (col.type === "checkbox") {
      return <span className="text-black/70">{v ? "✓" : <span className="text-black/30">—</span>}</span>;
    }

    if (col.type === "select" && typeof v === "string" && v.trim() && v !== "null") {
      return <span className={pillClass(v)}>{v}</span>;
    }

    if (v == null || v === "" || v === "null") return <span className="text-black/30">—</span>;
    return <span className="text-black/80 truncate">{String(v)}</span>;
  }

  // helper: open editor for a given cell with a known element/rect
  async function openCellEdit(args: {
    rowId: string;
    colKey: string;
    row: PlantingRow | null;
    el: HTMLDivElement;
  }) {
    const { rowId, colKey, row, el } = args;

    // capture rect BEFORE any await
    const rect = el.getBoundingClientRect();
    const value = getCellValue(rowId, colKey, row);

    store.setActive(true);
    store.select({ rowId, colKey });

    // commit current edit first (Airtable behavior)
    const ok = await commitActiveEditIfAny();
    if (!ok) return;

    // start edit next frame using the captured rect
    requestAnimationFrame(() => {
      beginEdit({ rowId, colKey, value, anchorRect: rect });
    });
  }

  return (
    <div ref={containerRef} className="max-h-[70vh] overflow-auto">
      {rows.map(({ id, row, isDraft }) => {
        const isSelected = selectedRowId === id && !isDraft;

        return (
          <div
            key={id}
            className={`flex border-b border-black/5 last:border-b-0 ${
              isDraft ? "bg-white/20" : isSelected ? "bg-black/3" : ""
            }`}
            onMouseDown={() => onRowBackgroundClick(row)}
          >
            {cols.map((c, i) => {
              const colKey = String(c.key);
              const cellSelected = selected?.rowId === id && selected?.colKey === colKey;

              return (
                <div
                  key={`${id}_${colKey}`}
                  data-cell="1"
                  className={`px-3 py-2 text-sm border-r border-black/5 last:border-r-0 cursor-text select-none ${
                    cellSelected ? " outline-2 outline-black/15" : ""
                  }`}
                  style={{ width: widths[i] }}
                  onMouseDown={(e) => {
                    e.stopPropagation();

                    // capture element synchronously
                    const el = e.currentTarget as HTMLDivElement;

                    // DO NOT use async event object after awaiting
                    void openCellEdit({ rowId: id, colKey, row, el });
                  }}
                >
                  <div className="truncate">{renderDisplay(id, c, row)}</div>
                </div>
              );
            })}

            {/* Airtable-like add row control */}
            {isDraft ? (
              <button
                className="px-3 py-2 text-xs text-black/45 hover:text-black/80"
                onMouseDown={(e) => {
                  e.stopPropagation();
                  // Focus the first column (Crop) on the new row
                  const firstColKey = String(cols[0]?.key ?? "crop");
                  const rowId = "__new__";
                  const el = (e.currentTarget as HTMLButtonElement)
                    .parentElement?.querySelector?.(`[data-cell="1"]`) as HTMLDivElement | null;

                  if (el) {
                    void openCellEdit({ rowId, colKey: firstColKey, row: null, el });
                  }
                }}
                onClick={(e) => e.stopPropagation()}
              >
                + Add planting
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}