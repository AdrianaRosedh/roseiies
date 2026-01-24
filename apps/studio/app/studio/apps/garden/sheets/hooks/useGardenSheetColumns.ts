// apps/studio/app/studio/apps/garden/sheets/hooks/useGardenSheetColumns.ts
"use client";

import { useEffect, useMemo, useState } from "react";
import type { Column } from "../types";

function lsColsKey(tenantId: string) {
  return `roseiies:garden:sheets:v3:cols:${tenantId}`;
}

export function useGardenSheetColumns(args: { tenantId: string; defaultCols: Column[] }) {
  const { tenantId, defaultCols } = args;
  const [cols, setCols] = useState<Column[]>(defaultCols);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(lsColsKey(tenantId));
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) setCols(parsed);
    } catch {}
  }, [tenantId]);

  useEffect(() => {
    try {
      localStorage.setItem(lsColsKey(tenantId), JSON.stringify(cols));
    } catch {}
  }, [tenantId, cols]);

  const colIndex = useMemo(() => new Map(cols.map((c) => [String(c.key), c])), [cols]);

  function addColumn() {
    const key = `field_${Math.random().toString(16).slice(2)}`;
    setCols((prev) => [...prev, { key, label: "New field", type: "text", width: 200 }]);
    return key;
  }

  function renameColumn(colKey: string, nextLabel: string) {
    const name = nextLabel.trim();
    if (!name) return;
    setCols((prev) => prev.map((c) => (String(c.key) === colKey ? { ...c, label: name } : c)));
  }

  function setColumnType(colKey: string, type: Column["type"]) {
    setCols((prev) =>
      prev.map((c) => {
        if (String(c.key) !== colKey) return c;
        const next: Column = { ...c, type };
        if (type === "select" && !next.options) next.options = { values: [] };
        if (type !== "select") delete next.options;
        return next;
      })
    );
  }

  function setSelectOptions(colKey: string, values: string[]) {
    setCols((prev) =>
      prev.map((c) =>
        String(c.key) === colKey ? { ...c, options: { values } } : c
      )
    );
  }

  return { cols, setCols, colIndex, addColumn, renameColumn, setColumnType, setSelectOptions };
}