// apps/studio/app/studio/apps/garden/sheets/components/GardenSheetsGrid.tsx
"use client";

import React, { useMemo, useState } from "react";
import type { Column, PlantingRow } from "../types";
import { pillClass } from "../types";

function isEditableTarget(t: EventTarget | null) {
  const el = t as HTMLElement | null;
  if (!el) return false;

  const tag = el.tagName?.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select" || tag === "button") return true;
  if ((el as any).isContentEditable) return true;

  // anything inside a cell counts as “interactive”
  if (el.closest?.('[data-cell="1"]')) return true;

  return false;
}

export default function GardenSheetsGrid(props: {
  cols: Column[];
  rows: Array<{ id: string; row: PlantingRow | null; isDraft: boolean }>;
  bedsAndTrees: any[];
  zonesForBed: (bedId: string | null) => string[];

  // ✅ needed so zone dropdown works for "__new__"
  getActiveBedIdForRow: (rowId: string, row: PlantingRow | null) => string | null;

  editing: { rowId: string; colKey: string } | null;
  draft: any;
  setDraft: (v: any) => void;

  getCellValue: (rowId: string, colKey: string, row: PlantingRow | null) => any;
  startEdit: (rowId: string, colKey: string, initial: any) => void;
  commitEdit: (opts?: { move?: "down" | "right" | "left" }) => Promise<void>;
  stopEdit: () => void;

  selectedRowId: string | null;
  onRowClick: (row: PlantingRow | null) => void;

  itemLabel: (id: string | null) => string;
}) {
  const {
    cols,
    rows,
    bedsAndTrees,
    zonesForBed,
    getActiveBedIdForRow,
    editing,
    draft,
    setDraft,
    getCellValue,
    startEdit,
    commitEdit,
    stopEdit,
    selectedRowId,
    onRowClick,
    itemLabel,
  } = props;

  const [renaming, setRenaming] = useState<{ colKey: string } | null>(null);
  const [renameDraft, setRenameDraft] = useState("");

  const widths = useMemo(() => cols.map((c) => c.width ?? 180), [cols]);

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

    if (key === "pin_x") {
      const rx = rowId === "__new__" ? null : row?.pin_x ?? null;
      const ry = rowId === "__new__" ? null : row?.pin_y ?? null;
      const has = rx != null && ry != null;
      return <span className="text-black/70">{has ? "✅" : "—"}</span>;
    }

    const v = getCellValue(rowId, key, row);

    if (col.type === "checkbox") {
      return (
        <span className="text-black/70">
          {v ? "✓" : <span className="text-black/30">—</span>}
        </span>
      );
    }

    if (col.type === "select" && typeof v === "string" && v.trim()) {
      return <span className={pillClass(v)}>{v}</span>;
    }

    if (v == null || v === "") return <span className="text-black/30">—</span>;
    return <span className="text-black/80 truncate">{String(v)}</span>;
  }

  function renderEditor(rowId: string, col: Column, row: PlantingRow | null) {
    const key = String(col.key);

    // ✅ “bulletproof”: editor never bubbles to row handlers
    const stopBub = {
      onMouseDown: (e: React.MouseEvent) => e.stopPropagation(),
      onClick: (e: React.MouseEvent) => e.stopPropagation(),
    } as const;

    // Bed/Tree select
    if (col.type === "select" && key === "bed_id") {
      return (
        <select
          autoFocus
          value={String(draft ?? "")}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => void commitEdit()}
          {...stopBub}
          className="w-full rounded-md border border-black/10 bg-white px-2 py-1 text-sm"
        >
          <option value="">—</option>
          {bedsAndTrees.map((it: any) => (
            <option key={it.id} value={it.id}>
              {it.label ?? (it.type === "tree" ? "Tree" : "Bed")}
              {it?.meta?.code ? ` (${it.meta.code})` : ""}
            </option>
          ))}
        </select>
      );
    }

    // Zone select depends on bed_id (works for __new__)
    if (col.type === "select" && key === "zone_code") {
      const bedId = getActiveBedIdForRow(rowId, row);
      const zones = zonesForBed(bedId);

      return (
        <select
          autoFocus
          value={String(draft ?? "")}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => void commitEdit()}
          {...stopBub}
          className="w-full rounded-md border border-black/10 bg-white px-2 py-1 text-sm"
        >
          <option value="">—</option>
          {zones.map((z) => (
            <option key={z} value={z}>
              {z}
            </option>
          ))}
        </select>
      );
    }

    // generic select
    if (col.type === "select") {
      const options = col.options?.values ?? [];
      return (
        <select
          autoFocus
          value={String(draft ?? "")}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => void commitEdit()}
          {...stopBub}
          className="w-full rounded-md border border-black/10 bg-white px-2 py-1 text-sm"
        >
          <option value="">—</option>
          {options.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      );
    }

    if (col.type === "date") {
      return (
        <input
          autoFocus
          type="date"
          value={String(draft ?? "")}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => void commitEdit()}
          {...stopBub}
          className="w-full rounded-md border border-black/10 bg-white px-2 py-1 text-sm"
        />
      );
    }

    if (col.type === "checkbox") {
      return (
        <label className="flex items-center gap-2" {...stopBub}>
          <input
            autoFocus
            type="checkbox"
            checked={Boolean(draft)}
            onChange={(e) => setDraft(e.target.checked)}
            onBlur={() => void commitEdit()}
          />
        </label>
      );
    }

    // TEXT / NUMBER
    const inputType = col.type === "number" ? "number" : "text";
    return (
      <input
        autoFocus
        type={inputType}
        value={draft == null ? "" : String(draft)}
        onChange={(e) => setDraft(e.target.value)}
        // ❗do NOT commit onBlur for text inputs; blur can happen due to app-wide focus changes
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            void commitEdit({ move: "down" });
          }
          if (e.key === "Tab") {
            e.preventDefault();
            void commitEdit({ move: e.shiftKey ? "left" : "right" });
          }
          if (e.key === "Escape") {
            e.preventDefault();
            stopEdit();
          }
        }}
        {...stopBub}
        className="w-full rounded-md border border-black/10 bg-white px-2 py-1 text-sm"
      />
    );
  }

  return (
    <div className="px-4 pb-4">
      <div className="rounded-xl border border-black/10 bg-white/55 backdrop-blur shadow-sm overflow-hidden">
        {/* header row */}
        <div className="flex border-b border-black/10 bg-white/70">
          {cols.map((c, i) => {
            const key = String(c.key);
            const isRenaming = renaming?.colKey === key;

            return (
              <div
                key={key}
                className="px-3 py-2 text-xs font-semibold text-black/70 border-r border-black/10 last:border-r-0"
                style={{ width: widths[i] }}
              >
                {isRenaming ? (
                  <input
                    autoFocus
                    value={renameDraft}
                    onChange={(e) => setRenameDraft(e.target.value)}
                    onBlur={() => {
                      setRenaming(null);
                      setRenameDraft("");
                    }}
                    className="w-full rounded-md border border-black/10 bg-white px-2 py-1 text-xs font-semibold text-black/80"
                  />
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 truncate">{c.label}</div>
                    <div className="text-[10px] font-medium text-black/40 uppercase tracking-wide">
                      {c.type}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* body */}
        <div className="max-h-[70vh] overflow-auto">
          {rows.map(({ id, row, isDraft }) => {
            const isSelected = selectedRowId === id && !isDraft;

            return (
              <div
                key={id}
                className={`flex border-b border-black/5 last:border-b-0 ${
                  isDraft ? "bg-white/35" : isSelected ? "bg-black/3" : ""
                }`}
                // ✅ row click only when clicking background (not a cell/editor)
                onMouseDown={(e) => {
                  if (isEditableTarget(e.target)) return;
                  onRowClick(row);
                }}
              >
                {cols.map((c, i) => {
                  const key = String(c.key);
                  const isEditing = editing?.rowId === id && editing?.colKey === key;
                  const initial = getCellValue(id, key, row);

                  return (
                    <div
                      key={`${id}_${key}`}
                      data-cell="1"
                      className="px-3 py-2 text-sm border-r border-black/5 last:border-r-0 cursor-text"
                      style={{ width: widths[i] }}
                      // ✅ start edit on mousedown so the input can focus immediately
                      onMouseDown={(e) => {
                        e.stopPropagation();

                        // already editing this cell
                        if (editing && editing.rowId === id && editing.colKey === key) return;

                        // switch cell: commit current, then start new next frame
                        if (editing) {
                          void commitEdit().finally(() => {
                            requestAnimationFrame(() => {
                              startEdit(id, key, initial ?? "");
                            });
                          });
                        } else {
                          startEdit(id, key, initial ?? "");
                        }
                      }}
                    >
                      {isEditing ? (
                        renderEditor(id, c, row)
                      ) : (
                        <div className="truncate">{renderDisplay(id, c, row)}</div>
                      )}
                    </div>
                  );
                })}

                {isDraft ? <div className="px-3 py-2 text-xs text-black/35">New record</div> : null}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-2 text-xs text-black/45">
        Tip: click a cell to edit. Enter saves + moves down. Tab saves + moves across.
      </div>
    </div>
  );
}
