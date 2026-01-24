// apps/studio/app/studio/apps/garden/sheets/hooks/useGardenSheetsModel.ts
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Column, PlantingRow } from "../types";
import { coerceByType, emptyDraftRow, isCoreKey } from "../types";

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

  const [editing, setEditing] = useState<{ rowId: string; colKey: string } | null>(null);
  const [draft, setDraft] = useState<any>("");
  const [draftRow, setDraftRow] = useState<Omit<PlantingRow, "id">>(emptyDraftRow());
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  const latestRef = useRef({
    editing: null as { rowId: string; colKey: string } | null,
    draft: "" as any,
  });

  useEffect(() => {
    latestRef.current = { editing, draft };
  }, [editing, draft]);

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

  // ✅ used by Grid: zone options need bedId even for __new__
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

  const startEdit = useCallback(
    (rowId: string, colKey: string, initial: any) => {
      setEditing({ rowId, colKey });
      const col = cols.find((c) => String(c.key) === colKey);
      if (col?.type === "checkbox") setDraft(Boolean(initial));
      else setDraft(initial == null ? "" : initial);
    },
    [cols]
  );

  const stopEdit = useCallback(() => {
    setEditing(null);
    setDraft("");
  }, []);

  const focusMapForRow = useCallback(
    (row: PlantingRow) => {
      const id = row.bed_id;
      if (!id) return;
      try {
        store?.setSelectedIds?.([id]);
      } catch {}
      try {
        store?.centerOnItem?.(id);
      } catch {}
    },
    [store]
  );

  const commitEdit = useCallback(
    async (opts?: { move?: "down" | "right" | "left" }) => {
      const snap = latestRef.current;
      if (!snap.editing) return;

      const { rowId, colKey } = snap.editing;
      const col = cols.find((c) => String(c.key) === colKey);
      if (!col) return;

      // --------------------------
      // NEW ROW creation (__new__)
      // --------------------------
      if (rowId === "__new__") {
        // apply edit into draftRow or custom cells
        if (isCoreKey(colKey)) {
          setDraftRow((prev) => ({ ...prev, [colKey]: coerceByType(col, snap.draft) } as any));
        } else {
          cell.set("__new__", colKey, coerceByType(col, snap.draft));
        }

        const nextDraft: Omit<PlantingRow, "id"> = {
          ...draftRow,
          ...(isCoreKey(colKey) ? ({ [colKey]: coerceByType(col, snap.draft) } as any) : {}),
        };

        const hasAny =
          Boolean(nextDraft.crop && String(nextDraft.crop).trim()) ||
          Boolean(nextDraft.bed_id && String(nextDraft.bed_id).trim()) ||
          Boolean(nextDraft.zone_code && String(nextDraft.zone_code).trim()) ||
          Boolean(nextDraft.planted_at && String(nextDraft.planted_at).trim()) ||
          Boolean(nextDraft.status && String(nextDraft.status).trim());

        stopEdit();

        if (!hasAny) return;

        const tempId = `tmp_${Math.random().toString(16).slice(2)}_${Date.now()}`;
        setRows((prev) => [{ id: tempId, ...nextDraft }, ...prev]);

        // ✅ capture all custom fields from __new__
        const customFromNew = cell.getRow("__new__");

        // clear new draft immediately (UI feels “snappy”)
        setDraftRow(emptyDraftRow());
        cell.delRow("__new__");

        try {
          const created = await create(nextDraft);

          // replace optimistic row with real row
          setRows((prev) => prev.map((r) => (r.id === tempId ? created : r)));

          // ✅ move custom fields to created row
          if (customFromNew && Object.keys(customFromNew).length) {
            cell.setRow(created.id, customFromNew);
          }

          focusMapForRow(created);
          setSelectedRowId(created.id);
        } catch (e) {
          console.error("Create planting failed:", e);

          // rollback optimistic
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
      // EXISTING ROW commit
      // --------------------------
      const row = rows.find((r) => r.id === rowId) ?? null;
      if (!row) return;

      if (isCoreKey(colKey)) {
        const patchObj: any = {};

        if (colKey === "bed_id") patchObj.bed_id = snap.draft === "" ? null : String(snap.draft);
        else if (colKey === "zone_code") patchObj.zone_code = snap.draft === "" ? null : String(snap.draft);
        else if (colKey === "planted_at") patchObj.planted_at = snap.draft === "" ? null : String(snap.draft);
        else if (colKey === "crop" || colKey === "status") patchObj[colKey] = snap.draft === "" ? null : String(snap.draft);
        else if (colKey === "pin_x" || colKey === "pin_y") patchObj[colKey] = snap.draft === "" ? null : Number(snap.draft);

        // ✅ if bed changes, invalidate zone if it doesn't exist on new bed
        if (colKey === "bed_id") {
          const nextBedId = patchObj.bed_id as string | null;
          const allowedZones = zonesForBed(nextBedId);
          if (row.zone_code && !allowedZones.includes(row.zone_code)) {
            patchObj.zone_code = null;
          }
        }

        stopEdit();
        await patch(rowId, patchObj);

        const merged = { ...row, ...patchObj } as PlantingRow;
        focusMapForRow(merged);
        setSelectedRowId(rowId);
      } else {
        // custom field
        cell.set(rowId, colKey, coerceByType(col, snap.draft));
        stopEdit();
      }

      // keyboard move
      if (opts?.move) {
        const colIndex = cols.findIndex((c) => String(c.key) === colKey);
        const rowIndex = rows.findIndex((r) => r.id === rowId);

        const next =
          opts.move === "right"
            ? { r: rowIndex, c: Math.min(cols.length - 1, colIndex + 1) }
            : opts.move === "left"
              ? { r: rowIndex, c: Math.max(0, colIndex - 1) }
              : { r: Math.min(rows.length, rowIndex + 1), c: colIndex };

        const nextRowId = next.r >= rows.length ? "__new__" : rows[next.r].id;
        const nextColKey = String(cols[next.c].key);
        const nextRow = nextRowId === "__new__" ? null : rows[next.r];

        const initial = getCellValue(nextRowId, nextColKey, nextRow);
        startEdit(nextRowId, nextColKey, initial ?? "");
      }
    },
    [
      cols,
      rows,
      setRows,
      draftRow,
      cell,
      create,
      patch,
      stopEdit,
      startEdit,
      getCellValue,
      zonesForBed,
      focusMapForRow,
      setSelectedRowId,
    ]
  );

  // ✅ Critical: auto-commit active edit on leave
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "hidden") void commitEdit();
    };
    const onBeforeUnload = () => {
      void commitEdit();
    };

    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      void commitEdit();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [commitEdit]);

  const onRowClick = useCallback(
    (row: PlantingRow | null) => {
      if (!row) return;
      setSelectedRowId(row.id);
      focusMapForRow(row);
    },
    [focusMapForRow]
  );

  return {
    editing,
    draft,
    setDraft,
    draftRow,
    setDraftRow,
    selectedRowId,
    setSelectedRowId,
    displayRows,
    itemLabel,
    zonesForBed,
    getActiveBedIdForRow, // ✅ expose for Grid so Zone select works on __new__
    getCellValue,
    startEdit,
    stopEdit,
    commitEdit,
    onRowClick,
  };
}
