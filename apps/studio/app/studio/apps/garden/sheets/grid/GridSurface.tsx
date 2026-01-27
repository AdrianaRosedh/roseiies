// apps/studio/app/studio/apps/garden/sheets/grid/GridSurface.tsx
"use client";

import React from "react";
import type { Column, PlantingRow } from "../types";
import type { GridStore } from "./store";
import { pillClass } from "../types";

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

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

  // ✅ new: bottom-left add row focuses first cell
  onAddRowFocusFirstCell: (args: { el: HTMLDivElement }) => void;

  // ✅ new: width for the add-column trailing cell so row layout matches header
  addColWidth: number;
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
    onAddRowFocusFirstCell,
    addColWidth,
  } = props;

  const selected = store.getState().selected;

  function renderDisplay(rowId: string, col: Column, row: PlantingRow | null) {
    const key = String(col.key);

    if (key === "bed_id") {
      const raw =
        rowId === "__new__"
          ? (getCellValue("__new__", "bed_id", null) ?? null)
          : row?.bed_id ?? null;
      const txt = raw ? itemLabel(raw) : "";
      return txt ? (
        <span className="text-black/80 truncate">{txt}</span>
      ) : (
        <span className="text-black/30">—</span>
      );
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

  async function openCellEdit(args: {
    rowId: string;
    colKey: string;
    row: PlantingRow | null;
    el: HTMLDivElement;
  }) {
    const { rowId, colKey, row, el } = args;

    const rect = el.getBoundingClientRect();
    const value = getCellValue(rowId, colKey, row);

    store.setActive(true);
    store.select({ rowId, colKey });

    const ok = await commitActiveEditIfAny();
    if (!ok) return;

    requestAnimationFrame(() => {
      beginEdit({ rowId, colKey, value, anchorRect: rect });
    });
  }

  const gutterW = 44;

  return (
    <div className="min-w-max">
      {rows.map(({ id, row, isDraft }, idx) => {
        const isSelectedRow = selectedRowId === id && !isDraft;

        return (
          <div
            key={id}
            className={cn(
              "flex border-b border-black/5 last:border-b-0",
              isDraft ? "bg-black/1.5" : isSelectedRow ? "bg-black/3" : "bg-white"
            )}
            onMouseDown={() => onRowBackgroundClick(row)}
          >
            {/* row gutter */}
            <div
              className={cn(
                "shrink-0 flex items-center justify-center border-r border-black/5",
                isDraft ? "bg-black/2" : "bg-black/1.5"
              )}
              style={{ width: gutterW }}
              onMouseDown={(e) => {
                e.stopPropagation();
                if (isDraft) return;
                onRowBackgroundClick(row);
              }}
              title={isDraft ? "Add row" : "Row"}
            >
              {isDraft ? (
                <div
                  className="h-7 w-7 rounded-lg border border-black/10 bg-white/80 hover:bg-white flex items-center justify-center text-sm text-black/70 cursor-pointer"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    const el = e.currentTarget as HTMLDivElement;
                    onAddRowFocusFirstCell({ el });
                  }}
                >
                  +
                </div>
              ) : (
                <span className={cn("text-xs", isSelectedRow ? "text-black/70" : "text-black/35")}>
                  {idx + 1}
                </span>
              )}
            </div>

            {/* cells */}
            {cols.map((c, i) => {
              const colKey = String(c.key);
              const cellSelected = selected?.rowId === id && selected?.colKey === colKey;

              return (
                <div
                  key={`${id}_${colKey}`}
                  data-cell="1"
                  className={cn(
                    "px-3 py-2 text-sm border-r border-black/5 last:border-r-0 cursor-text select-none",
                    cellSelected && "ring-2 ring-black/10"
                  )}
                  style={{ width: widths[i] }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    const el = e.currentTarget as HTMLDivElement;
                    void openCellEdit({ rowId: id, colKey, row, el });
                  }}
                >
                  <div className="truncate">{renderDisplay(id, c, row)}</div>
                </div>
              );
            })}

            {/* trailing spacer column (aligns with header + column button) */}
            <div
              className="shrink-0 border-l border-black/0"
              style={{ width: addColWidth }}
            />
          </div>
        );
      })}
    </div>
  );
}
