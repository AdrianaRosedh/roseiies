// apps/studio/app/studio/apps/garden/sheets/components/GardenSheetsMobileList.tsx
"use client";

import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { Column, PlantingRow } from "../types";
import { pillClass } from "../types";

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function labelForItem(it: any) {
  const base =
    typeof it?.label === "string" && it.label.trim() !== ""
      ? it.label.trim()
      : it?.id
        ? String(it.id)
        : it?.type === "tree"
          ? "Tree"
          : "Bed";
  const code = it?.meta?.code ? ` (${String(it.meta.code).trim()})` : "";
  return `${base}${code}`.trim();
}

/* ---------------------------------------------
   Portal Bottom Sheet (wins against any nav)
---------------------------------------------- */
function PortalSheet(props: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const { open, title, onClose, children } = props;

  const [mounted, setMounted] = React.useState(false);
  const [phase, setPhase] = React.useState<"enter" | "entered" | "exit">("enter");

  React.useEffect(() => {
    if (!open) return;

    setMounted(true);
    setPhase("enter");

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const raf = requestAnimationFrame(() => setPhase("entered"));

    // Esc closes
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        requestClose();
      }
    };
    window.addEventListener("keydown", onKey);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const requestClose = React.useCallback(() => {
    // animate out, then close
    setPhase("exit");
    window.setTimeout(() => {
      setMounted(false);
      onClose();
    }, 220);
  }, [onClose]);

  if (!open && !mounted) return null;
  if (typeof document === "undefined") return null;

  const backdrop =
    phase === "entered" ? "opacity-100" : phase === "exit" ? "opacity-0" : "opacity-0";
  const sheetY =
    phase === "entered" ? "translate-y-0" : phase === "exit" ? "translate-y-[18px]" : "translate-y-[18px]";

  return createPortal(
    <div className="fixed inset-0 md:hidden z-10000">
      {/* Backdrop */}
      <div
        className={cn(
          "absolute inset-0 bg-black/35 transition-opacity duration-200 ease-out",
          backdrop
        )}
        onMouseDown={requestClose}
      />

      {/* Sheet: slightly higher, stable height, only inner scroll */}
      <div className="absolute inset-x-0 bottom-0 flex justify-center px-2 pb-2">
        <div
          className={cn(
            "w-full max-w-130",
            "h-[82vh]", // ✅ stable height so the sheet doesn't “move”
            "rounded-t-[28px] rounded-b-[22px]",
            "border border-black/10 bg-white shadow-2xl",
            "transition-transform duration-200 ease-out will-change-transform",
            sheetY
          )}
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Sticky header */}
          <div className="sticky top-0 z-10 bg-white/90 backdrop-blur rounded-t-[28px] border-b border-black/10">
            <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-black/10" />
            <div className="px-4 pt-3 pb-3 flex items-center justify-between">
              <div className="text-sm font-semibold text-black/85">{title}</div>
              <button
                onClick={requestClose}
                className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-black/70 active:scale-[0.99] transition"
              >
                Done
              </button>
            </div>
          </div>

          {/* Scroll region */}
          <div className="h-[calc(82vh-64px)] overflow-y-auto overscroll-contain px-4 pb-5">
            {children}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function GardenSheetsMobileList(props: {
  cols: Column[];
  rows: Array<{ id: string; row: PlantingRow | null; isDraft: boolean }>;

  bedsAndTrees: any[];
  zonesForBed: (bedId: string | null) => string[];

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

  onAddColumn: () => unknown | Promise<unknown>;
}) {
  const { cols, rows, bedsAndTrees, zonesForBed, selectedRowId, onRowClick, itemLabel, getCellValue, commitCell, onAddColumn } =
    props;

  const [openRowId, setOpenRowId] = useState<string | null>(null);

  const visible = useMemo(
    () => rows.filter((r) => !r.isDraft && r.row) as Array<{ id: string; row: PlantingRow; isDraft: false }>,
    [rows]
  );

  function openEditor(rowId: string) {
    setOpenRowId(rowId);
  }
  function closeEditor() {
    setOpenRowId(null);
  }

  async function updateField(rowId: string, colKey: string, value: any, row: PlantingRow | null) {
    await commitCell({ rowId, colKey, value });
    if (row && rowId !== "__new__") onRowClick(row);
  }

  const editingRow =
    openRowId === "__new__" ? null : visible.find((x) => x.id === openRowId)?.row ?? null;

  return (
    <div className="relative h-full bg-black/2">
      <div className="p-3 space-y-2">
        {visible.length === 0 ? (
          <div className="rounded-2xl border border-black/10 bg-white/70 p-4">
            <div className="text-sm font-semibold text-black/80">No plantings yet</div>
            <div className="mt-1 text-sm text-black/55">Tap + to add your first planting.</div>
          </div>
        ) : null}

        {visible.map(({ id, row }) => {
          const crop = row.crop ?? "—";
          const status = row.status ?? "";
          const bed = row.bed_id ? itemLabel(row.bed_id) : "—";
          const zone = row.zone_code ?? "—";
          const planted = row.planted_at ?? "—";

          const active = selectedRowId === id;

          return (
            <button
              key={id}
              onClick={() => openEditor(id)}
              className={cn(
                "w-full text-left rounded-2xl border bg-white/80 backdrop-blur px-4 py-3",
                active ? "border-black/20" : "border-black/10",
                "active:scale-[0.99] transition"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-black/85 truncate">{crop}</div>
                  <div className="mt-1 text-xs text-black/55 truncate">
                    {bed} • Zone {zone} • {planted}
                  </div>
                </div>

                {status ? <span className={pillClass(status)}>{status}</span> : null}
              </div>
            </button>
          );
        })}
      </div>

      {/* Floating Add */}
      <button
        type="button"
        onClick={() => openEditor("__new__")}
        className="fixed md:hidden bottom-6 right-6 h-12 w-12 rounded-2xl border border-black/10 bg-white shadow-lg flex items-center justify-center text-xl text-black/70"
        title="Add planting"
      >
        +
      </button>

      <PortalSheet
        open={!!openRowId}
        title={openRowId === "__new__" ? "New planting" : "Edit planting"}
        onClose={closeEditor}
      >
        <div className="space-y-3">
          <div className="flex gap-2">
            <button
              onClick={() => onAddColumn()}
              className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-black/70"
            >
              + Column
            </button>
          </div>

          {cols.map((c) => {
            const colKey = String(c.key);
            const rowId = openRowId ?? "__new__";

            const current =
              rowId === "__new__"
                ? getCellValue("__new__", colKey, null)
                : getCellValue(rowId, colKey, editingRow);

            // Bed/tree select
            if (c.type === "select" && colKey === "bed_id") {
              return (
                <div key={colKey}>
                  <div className="text-xs font-semibold text-black/60">{c.label}</div>
                  <select
                    value={String(current ?? "")}
                    onChange={(e) => void updateField(rowId, colKey, e.target.value, editingRow)}
                    className="mt-1 w-full rounded-2xl border border-black/10 bg-white px-3 py-3 text-sm"
                  >
                    <option value="">—</option>
                    {bedsAndTrees.map((it: any) => (
                      <option key={it.id} value={it.id}>
                        {labelForItem(it)}
                      </option>
                    ))}
                  </select>
                </div>
              );
            }

            // Zone select
            if (c.type === "select" && colKey === "zone_code") {
              const bedId =
                rowId === "__new__"
                  ? (getCellValue("__new__", "bed_id", null) ?? null)
                  : (editingRow?.bed_id ?? null);

              const zones = zonesForBed(bedId);
              const disabled = !bedId || zones.length === 0;

              return (
                <div key={colKey}>
                  <div className="text-xs font-semibold text-black/60">{c.label}</div>
                  <select
                    disabled={disabled}
                    value={disabled ? "" : String(current ?? "")}
                    onChange={(e) => void updateField(rowId, colKey, e.target.value, editingRow)}
                    className={cn(
                      "mt-1 w-full rounded-2xl border border-black/10 bg-white px-3 py-3 text-sm",
                      disabled && "opacity-50"
                    )}
                  >
                    <option value="">—</option>
                    {zones.map((z) => (
                      <option key={z} value={z}>
                        {z}
                      </option>
                    ))}
                  </select>
                  {disabled ? (
                    <div className="mt-1 text-xs text-black/45">
                      Select a bed first (or add zones to that bed).
                    </div>
                  ) : null}
                </div>
              );
            }

            // Generic select
            if (c.type === "select") {
              const opts = c.options?.values ?? [];
              return (
                <div key={colKey}>
                  <div className="text-xs font-semibold text-black/60">{c.label}</div>
                  <select
                    value={String(current ?? "")}
                    onChange={(e) => void updateField(rowId, colKey, e.target.value, editingRow)}
                    className="mt-1 w-full rounded-2xl border border-black/10 bg-white px-3 py-3 text-sm"
                  >
                    <option value="">—</option>
                    {opts.map((v) => (
                      <option key={String(v)} value={String(v)}>
                        {String(v)}
                      </option>
                    ))}
                  </select>
                </div>
              );
            }

            if (c.type === "date") {
              return (
                <div key={colKey}>
                  <div className="text-xs font-semibold text-black/60">{c.label}</div>
                  <input
                    type="date"
                    value={String(current ?? "")}
                    onChange={(e) => void updateField(rowId, colKey, e.target.value, editingRow)}
                    className="mt-1 w-full rounded-2xl border border-black/10 bg-white px-3 py-3 text-sm"
                  />
                </div>
              );
            }

            if (c.type === "checkbox") {
              return (
                <div key={colKey} className="flex items-center justify-between rounded-2xl border border-black/10 bg-white px-3 py-3">
                  <div className="text-sm font-medium text-black/75">{c.label}</div>
                  <input
                    type="checkbox"
                    checked={Boolean(current)}
                    onChange={(e) => void updateField(rowId, colKey, e.target.checked, editingRow)}
                    className="h-5 w-5"
                  />
                </div>
              );
            }

            // text / number
            return (
              <div key={colKey}>
                <div className="text-xs font-semibold text-black/60">{c.label}</div>
                <input
                  type={c.type === "number" ? "number" : "text"}
                  value={String(current ?? "")}
                  onChange={(e) => void updateField(rowId, colKey, e.target.value, editingRow)}
                  className="mt-1 w-full rounded-2xl border border-black/10 bg-white px-3 py-3 text-sm"
                />
              </div>
            );
          })}
        </div>
      </PortalSheet>
    </div>
  );
}
