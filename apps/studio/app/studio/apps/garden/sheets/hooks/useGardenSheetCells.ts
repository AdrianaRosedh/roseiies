// apps/studio/app/studio/apps/garden/sheets/hooks/useGardenSheetCells.ts
"use client";

import { useEffect, useMemo, useState } from "react";

function lsCellsKey(tenantId: string, gardenName: string) {
  return `roseiies:garden:sheets:v3:cells:${tenantId}:${gardenName}`;
}

export function useGardenSheetCells(args: { tenantId: string; gardenName: string | null }) {
  const { tenantId, gardenName } = args;

  const [cells, setCells] = useState<Record<string, Record<string, any>>>({});

  useEffect(() => {
    if (!gardenName) return;
    try {
      const raw = localStorage.getItem(lsCellsKey(tenantId, gardenName));
      if (raw) setCells(JSON.parse(raw) ?? {});
      else setCells({});
    } catch {
      setCells({});
    }
  }, [tenantId, gardenName]);

  useEffect(() => {
    if (!gardenName) return;
    try {
      localStorage.setItem(lsCellsKey(tenantId, gardenName), JSON.stringify(cells));
    } catch {}
  }, [tenantId, gardenName, cells]);

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