// apps/studio/app/studio/apps/garden/sheets/hooks/useGardenSheetCells.ts
"use client";

import { useEffect, useMemo, useState } from "react";

function stableCellsKey(tenantId: string, gardenId: string) {
  return `roseiies:garden:sheets:v4:cells:${tenantId}:${gardenId}`;
}

export function useGardenSheetCells(args: { tenantId: string; gardenId: string | null }) {
  const { tenantId, gardenId } = args;

  const [cells, setCells] = useState<Record<string, Record<string, any>>>({});

  const storageKey = useMemo(() => {
    if (!gardenId) return null;
    return stableCellsKey(tenantId, gardenId);
  }, [tenantId, gardenId]);

  useEffect(() => {
    if (!storageKey) return;

    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setCells(JSON.parse(raw) ?? {});
      else setCells({});
    } catch {
      setCells({});
    }
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(cells));
    } catch {}
  }, [storageKey, cells]);

  const cell = useMemo(() => {
    function get(rowId: string, colKey: string) {
      return (cells[rowId] ?? {})[colKey];
    }

    function set(rowId: string, colKey: string, value: any) {
      setCells((prev) => ({
        ...prev,
        [rowId]: { ...(prev[rowId] ?? {}), [colKey]: value },
      }));
    }

    function getRow(rowId: string): Record<string, any> {
      return { ...(cells[rowId] ?? {}) };
    }

    function setRow(rowId: string, rowData: Record<string, any>) {
      setCells((prev) => ({
        ...prev,
        [rowId]: { ...(prev[rowId] ?? {}), ...(rowData ?? {}) },
      }));
    }

    function delRow(rowId: string) {
      setCells((prev) => {
        const { [rowId]: _, ...rest } = prev;
        return rest;
      });
    }

    return { get, set, getRow, setRow, delRow };
  }, [cells]);

  return { cells, setCells, cell };
}