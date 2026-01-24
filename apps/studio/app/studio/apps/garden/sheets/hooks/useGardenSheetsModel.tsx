// apps/studio/app/studio/apps/garden/sheets/hooks/useGardenSheetsModel.tsx
"use client";

import { useCallback, useMemo, useState } from "react";
import type { Column, PlantingRow } from "../types";
import { coerceByType, emptyDraftRow, isCoreKey } from "../types";

function normalizeValue(v: any) {
  if (v == null) return "";
  if (v === "null") return "";
  return v;
}

function normalizeStringOrNull(v: any): string | null {
  const n = normalizeValue(v);
  const s = String(n ?? "").trim();
  return s.length ? s : null;
}

function isValidBedOrTreeId(bedsAndTrees: any[], id: any): id is string {
  if (!id || typeof id !== "string") return false;
  return bedsAndTrees.some((it) => it?.id === id);
}

export function useGardenSheetsModel(args: {
  store: any;
  gardenName: string | null;
  rows: PlantingRow[];
  setRows: (fn: (prev: PlantingRow[]) => PlantingRow[]) => void;
  cols: Column[];
  cell: {
    get: (rowId: string, colKey: string) => any;
    set: (rowId: string, colKey: string, v: any) => void;
    getRow: (rowId: string) => Record<string, any>;
    setRow: (rowId: string, rowData: Record<string, any>) => void;
    delRow: (rowId: string) => void;
  };
  create: (draft: Omit<PlantingRow, "id">) => Promise<PlantingRow>;
  patch: (id: string, patch: Partial<PlantingRow>) => Promise<void>;
  bedsAndTrees: Array<any>;
  bedsOnly: Array<any>;
}) {
  const { store, rows, setRows, cols, cell, create, patch, bedsAndTrees, bedsOnly } = args;

  const [draftRow, setDraftRow] = useState<Omit<PlantingRow, "id">>(emptyDraftRow());
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  const displayRows = useMemo(() => {
    const out = rows.map((r) => ({ id: r.id, row: r, isDraft: false }));
    out.push({ id: "__new__", row: null as any, isDraft: true });
    return out;
  }, [rows]);

  const itemLabel = useCallback(
    (id: string | null) => {
      if (!id) return "";
      const it = bedsAndTrees.find((x: any) => x.id === id);
      if (!it) return id;
      const code = it?.meta?.code ? ` (${it.meta.code})` : "";
      const base = it.label ?? (it.type === "tree" ? "Tree" : "Bed");
      return `${base}${code}`;
    },
    [bedsAndTrees]
  );

  const zonesForBed = useCallback(
    (bedId: string | null) => {
      if (!bedId) return [];
      const bed = bedsOnly.find((b: any) => b.id === bedId);
      const zones = bed?.meta?.zones;
      if (!Array.isArray(zones)) return [];
      return zones.map((z: any) => String(z?.code ?? "").trim()).filter(Boolean);
    },
    [bedsOnly]
  );

  const getActiveBedIdForRow = useCallback(
    (rowId: string, row: PlantingRow | null) => {
      if (rowId === "__new__") return draftRow.bed_id ?? null;
      return row?.bed_id ?? null;
    },
    [draftRow.bed_id]
  );

  const getCellValue = useCallback(
    (rowId: string, colKey: string, row: PlantingRow | null) => {
      if (rowId === "__new__") {
        if (isCoreKey(colKey)) return (draftRow as any)[colKey];
        return cell.get("__new__", colKey);
      }
      if (row && isCoreKey(colKey)) return (row as any)[colKey];
      return cell.get(rowId, colKey);
    },
    [cell, draftRow]
  );

  // ✅ Prevent “blank map”: never focus/center an invalid id
  const focusMapForRow = useCallback(
    (row: PlantingRow) => {
      const id = row.bed_id;
      if (!isValidBedOrTreeId(bedsAndTrees, id)) return;

      try {
        store?.setSelectedIds?.([id]);
      } catch {}
      try {
        store?.centerOnItem?.(id);
      } catch {}
    },
    [store, bedsAndTrees]
  );

  const getRowById = useCallback(
    (rowId: string) => {
      if (rowId === "__new__") return null;
      return rows.find((r) => r.id === rowId) ?? null;
    },
    [rows]
  );

  const commitCell = useCallback(
    async (args: { rowId: string; colKey: string; value: any; move?: "down" | "right" | "left" }) => {
      const { rowId, colKey, value } = args;
      const col = cols.find((c) => String(c.key) === colKey);
      if (!col) return;

      // --------------------------
      // NEW ROW (__new__)
      // --------------------------
      if (rowId === "__new__") {
        const raw = coerceByType(col, value);
        const coerced = normalizeValue(raw);

        if (isCoreKey(colKey)) {
          setDraftRow((prev) => ({ ...prev, [colKey]: coerced } as any));
        } else {
          cell.set("__new__", colKey, coerced);
        }

        const nextDraft: Omit<PlantingRow, "id"> = {
          ...draftRow,
          ...(isCoreKey(colKey) ? ({ [colKey]: coerced } as any) : {}),
        };

        // ✅ enforce required fields BEFORE create
        const cropValue = normalizeStringOrNull(nextDraft.crop);
        const bedValue = normalizeStringOrNull(nextDraft.bed_id);

        if (!cropValue) return;
        if (!bedValue || !isValidBedOrTreeId(bedsAndTrees, bedValue)) return;

        nextDraft.crop = cropValue;
        nextDraft.bed_id = bedValue;

        // ✅ validate zone if present
        if (nextDraft.zone_code) {
          const z = normalizeStringOrNull(nextDraft.zone_code);
          const allowed = zonesForBed(bedValue);
          nextDraft.zone_code = z && allowed.includes(z) ? z : null;
        }

        const tempId = `tmp_${Math.random().toString(16).slice(2)}_${Date.now()}`;
        setRows((prev) => [{ id: tempId, ...nextDraft }, ...prev]);

        const customFromNew = cell.getRow("__new__");

        // clear draft immediately
        setDraftRow(emptyDraftRow());
        cell.delRow("__new__");

        try {
          const created = await create(nextDraft);
          setRows((prev) => prev.map((r) => (r.id === tempId ? created : r)));

          if (customFromNew && Object.keys(customFromNew).length) {
            cell.setRow(created.id, customFromNew);
          }

          focusMapForRow(created);
          setSelectedRowId(created.id);
        } catch (e) {
          console.error("Create planting failed:", e);
          setRows((prev) => prev.filter((r) => r.id !== tempId));

          // restore draft
          setDraftRow(nextDraft);
          if (customFromNew && Object.keys(customFromNew).length) {
            cell.setRow("__new__", customFromNew);
          }
        }
        return;
      }

      // --------------------------
      // EXISTING ROW
      // --------------------------
      const row = rows.find((r) => r.id === rowId) ?? null;
      if (!row) return;

      if (isCoreKey(colKey)) {
        const patchObj: any = {};
        const raw = coerceByType(col, value);
        const coerced = normalizeValue(raw);

        if (colKey === "crop") patchObj.crop = normalizeStringOrNull(coerced);

        if (colKey === "status") patchObj.status = normalizeStringOrNull(coerced);

        if (colKey === "planted_at") patchObj.planted_at = normalizeStringOrNull(coerced);

        if (colKey === "bed_id") {
          const next = normalizeStringOrNull(coerced);
          patchObj.bed_id = next && isValidBedOrTreeId(bedsAndTrees, next) ? next : null;

          // if bed changes, zone must still be valid
          const allowed = zonesForBed(patchObj.bed_id ?? null);
          if (row.zone_code && !allowed.includes(row.zone_code)) {
            patchObj.zone_code = null;
          }
        }

        if (colKey === "zone_code") {
          const z = normalizeStringOrNull(coerced);
          const bedId = row.bed_id && isValidBedOrTreeId(bedsAndTrees, row.bed_id) ? row.bed_id : null;
          const allowed = zonesForBed(bedId);
          patchObj.zone_code = z && allowed.includes(z) ? z : null;
        }

        if (colKey === "pin_x" || colKey === "pin_y") {
          patchObj[colKey] = coerced === "" ? null : Number(coerced);
        }

        try {
          await patch(rowId, patchObj);
        } catch (e) {
          console.error("Patch failed:", e);
        }

        const merged = { ...row, ...patchObj } as PlantingRow;

        // ✅ only focus map when valid
        focusMapForRow(merged);
        setSelectedRowId(rowId);
      } else {
        // custom field: local only
        const raw = coerceByType(col, value);
        const coerced = normalizeValue(raw);
        cell.set(rowId, colKey, coerced);
      }
    },
    [cols, rows, setRows, draftRow, cell, create, patch, zonesForBed, focusMapForRow, bedsAndTrees]
  );

  const onRowClick = useCallback(
    (row: PlantingRow | null) => {
      if (!row) return;
      setSelectedRowId(row.id);
      focusMapForRow(row);
    },
    [focusMapForRow]
  );

  return {
    displayRows,
    selectedRowId,
    setSelectedRowId,
    itemLabel,
    zonesForBed,
    getActiveBedIdForRow,
    getCellValue,
    commitCell,
    onRowClick,
    getRowById,
  };
}