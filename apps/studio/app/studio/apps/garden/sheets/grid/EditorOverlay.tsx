// apps/studio/app/studio/apps/garden/sheets/grid/EditorOverlay.tsx
"use client";

import React, { useEffect, useMemo, useRef } from "react";
import type { Column, PlantingRow } from "../types";
import type { GridStore } from "./store";

function normalizeValue(v: any) {
  if (v == null) return "";
  if (v === "null") return "";
  return v;
}

function labelForItem(it: any) {
  const base =
    (typeof it?.label === "string" && it.label.trim() !== "")
      ? it.label.trim()
      : (it?.id ? String(it.id) : (it?.type === "tree" ? "Tree" : "Bed"));

  const code = it?.meta?.code ? ` (${String(it.meta.code).trim()})` : "";
  return `${base}${code}`.trim();
}

export default function EditorOverlay(props: {
  store: GridStore;
  cols: Column[];
  bedsAndTrees: any[];
  zonesForBed: (bedId: string | null) => string[];
  getActiveBedIdForRow: (rowId: string, row: PlantingRow | null) => string | null;
  getCellValue: (rowId: string, colKey: string, row: PlantingRow | null) => any;
  commit: (args: {
    rowId: string;
    colKey: string;
    value: any;
    move?: "down" | "right" | "left";
  }) => Promise<void>;
  getRowById: (rowId: string) => PlantingRow | null;
}) {
  const {
    store,
    cols,
    bedsAndTrees,
    zonesForBed,
    getActiveBedIdForRow,
    commit,
    getRowById,
  } = props;

  const ed = store.getState().editing;
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null);

  useEffect(() => {
    if (!ed) return;
    requestAnimationFrame(() => {
      const el = inputRef.current;
      el?.focus?.();
      if (el instanceof HTMLInputElement) {
        try {
          el.select?.();
        } catch {}
      }
    });
  }, [ed?.cell.rowId, ed?.cell.colKey]);

  const col = useMemo(() => {
    if (!ed) return null;
    return cols.find((c) => String(c.key) === ed.cell.colKey) ?? null;
  }, [cols, ed?.cell.colKey]);

  const anchor = ed?.anchorRect ?? null;
  if (!ed || !col || !anchor) return null;

  const row = getRowById(ed.cell.rowId);

  const style: React.CSSProperties = {
    position: "fixed",
    left: Math.round(anchor.left),
    top: Math.round(anchor.top),
    width: Math.round(anchor.width),
    height: Math.round(anchor.height),
    zIndex: 9999,
  };

  const commonProps = {
    onMouseDown: (e: React.MouseEvent) => e.stopPropagation(),
    onClick: (e: React.MouseEvent) => e.stopPropagation(),
    className:
      "w-full h-full rounded-md border border-black/10 bg-white px-2 py-1 text-sm outline-none",
  } as const;

  async function commitAndMove(move?: "down" | "right" | "left") {
    const snap = store.getState().editing;
    if (!snap) return;

    await commit({
      rowId: snap.cell.rowId,
      colKey: snap.cell.colKey,
      value: snap.value,
      move,
    });
  }

  const setInputRef = (n: HTMLInputElement | null) => {
    inputRef.current = n;
  };
  const setSelectRef = (n: HTMLSelectElement | null) => {
    inputRef.current = n;
  };

  const safeValue = String(normalizeValue(ed.value) ?? "");

  // ---------------------------------------------------------
  // ✅ Bed/Tree select (STRICT: stores it.id)
  // ---------------------------------------------------------
  if (col.type === "select" && String(col.key) === "bed_id") {
    return (
      <div style={style}>
        <select
          ref={setSelectRef}
          value={safeValue}
          onChange={(e) => store.updateDraft(e.target.value)} // ✅ saves id, not label
          onBlur={() => void commitAndMove()}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void commitAndMove("down");
            }
            if (e.key === "Tab") {
              e.preventDefault();
              void commitAndMove(e.shiftKey ? "left" : "right");
            }
            if (e.key === "Escape") {
              e.preventDefault();
              store.endEdit();
            }
          }}
          {...commonProps}
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

  // ---------------------------------------------------------
  // ✅ Zone select depends on bed_id (STRICT: only valid zones)
  // ---------------------------------------------------------
  if (col.type === "select" && String(col.key) === "zone_code") {
    const bedId = getActiveBedIdForRow(ed.cell.rowId, row);
    const zones = zonesForBed(bedId);

    const disabled = !bedId || zones.length === 0;

    return (
      <div style={style}>
        <select
          ref={setSelectRef}
          disabled={disabled}
          value={disabled ? "" : safeValue}
          onChange={(e) => store.updateDraft(e.target.value)}
          onBlur={() => void commitAndMove()}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void commitAndMove("down");
            }
            if (e.key === "Tab") {
              e.preventDefault();
              void commitAndMove(e.shiftKey ? "left" : "right");
            }
            if (e.key === "Escape") {
              e.preventDefault();
              store.endEdit();
            }
          }}
          {...commonProps}
          className={`${commonProps.className} ${disabled ? "opacity-50" : ""}`}
        >
          <option value="">—</option>
          {zones.map((z) => (
            <option key={z} value={z}>
              {z}
            </option>
          ))}
        </select>
      </div>
    );
  }

  // ---------------------------------------------------------
  // Generic select
  // ---------------------------------------------------------
  if (col.type === "select") {
    const opts = col.options?.values ?? [];
    return (
      <div style={style}>
        <select
          ref={setSelectRef}
          value={safeValue}
          onChange={(e) => store.updateDraft(e.target.value)}
          onBlur={() => void commitAndMove()}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void commitAndMove("down");
            }
            if (e.key === "Tab") {
              e.preventDefault();
              void commitAndMove(e.shiftKey ? "left" : "right");
            }
            if (e.key === "Escape") {
              e.preventDefault();
              store.endEdit();
            }
          }}
          {...commonProps}
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

  // ---------------------------------------------------------
  // Date
  // ---------------------------------------------------------
  if (col.type === "date") {
    return (
      <div style={style}>
        <input
          ref={setInputRef}
          type="date"
          value={safeValue}
          onChange={(e) => store.updateDraft(e.target.value)}
          onBlur={() => void commitAndMove()}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void commitAndMove("down");
            }
            if (e.key === "Tab") {
              e.preventDefault();
              void commitAndMove(e.shiftKey ? "left" : "right");
            }
            if (e.key === "Escape") {
              e.preventDefault();
              store.endEdit();
            }
          }}
          {...commonProps}
        />
      </div>
    );
  }

  // ---------------------------------------------------------
  // Checkbox
  // ---------------------------------------------------------
  if (col.type === "checkbox") {
    return (
      <div style={style} className="flex items-center justify-center">
        <label
          className="w-full h-full flex items-center justify-center rounded-md border border-black/10 bg-white"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <input
            ref={setInputRef}
            type="checkbox"
            checked={Boolean(ed.value && ed.value !== "null")}
            onChange={(e) => store.updateDraft(e.target.checked)}
            onBlur={() => void commitAndMove()}
          />
        </label>
      </div>
    );
  }

  // ---------------------------------------------------------
  // Text / number
  // ---------------------------------------------------------
  const inputType = col.type === "number" ? "number" : "text";
  return (
    <div style={style}>
      <input
        ref={setInputRef}
        type={inputType}
        value={safeValue}
        onChange={(e) => store.updateDraft(e.target.value)}
        onBlur={() => void commitAndMove()}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            void commitAndMove("down");
          }
          if (e.key === "Tab") {
            e.preventDefault();
            void commitAndMove(e.shiftKey ? "left" : "right");
          }
          if (e.key === "Escape") {
            e.preventDefault();
            store.endEdit();
          }
        }}
        {...commonProps}
      />
    </div>
  );
}
