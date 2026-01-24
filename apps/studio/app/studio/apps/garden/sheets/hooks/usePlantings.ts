// apps/studio/app/studio/apps/garden/sheets/hooks/usePlantings.ts
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { PlantingRow } from "../types";

function getStudioToken(): string | null {
  const t = process.env.NEXT_PUBLIC_ROSEIIES_STUDIO_TOKEN;
  if (!t || t.trim() === "") return null;
  return t.trim();
}

export function usePlantings(args: { gardenName: string | null; tenantId: string }) {
  const { gardenName } = args;

  const [rows, setRows] = useState<PlantingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!gardenName) return;
    setLoading(true);
    setLastError(null);
    try {
      const res = await fetch(`/api/plantings?gardenName=${encodeURIComponent(gardenName)}`);
      const text = await res.text();
      const json = text ? JSON.parse(text) : null;

      if (!res.ok) {
        const msg = typeof json?.error === "string" ? json.error : text || `HTTP ${res.status}`;
        setLastError(msg);
        setRows([]);
        return;
      }
      setRows(Array.isArray(json) ? (json as PlantingRow[]) : []);
    } catch (e: any) {
      setLastError(e?.message ?? "Failed to load plantings");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [gardenName]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback(
    async (draft: Omit<PlantingRow, "id">) => {
      if (!gardenName) {
        setLastError("Missing gardenName");
        // fallback local create
        const local: PlantingRow = { id: `local_${Date.now()}`, ...draft } as any;
        setRows((prev) => [local, ...prev]);
        return local;
      }

      const token = getStudioToken();

      // ✅ Local-only mode if token missing
      if (!token) {
        setLastError("Studio token missing — saved locally (not synced)");
        const local: PlantingRow = { id: `local_${Date.now()}`, ...draft } as any;
        setRows((prev) => [local, ...prev]);
        return local;
      }

      const payload = { gardenName, ...draft };

      const res = await fetch("/api/plantings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-roseiies-studio-token": token,
        },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      const json = text ? JSON.parse(text) : null;

      if (!res.ok) {
        const msg = typeof json?.error === "string" ? json.error : text || `HTTP ${res.status}`;
        setLastError(msg);
        // fallback local create so user can keep working
        const local: PlantingRow = { id: `local_${Date.now()}`, ...draft } as any;
        setRows((prev) => [local, ...prev]);
        return local;
      }

      const created = json as PlantingRow;
      setRows((prev) => [created, ...prev]);
      return created;
    },
    [gardenName]
  );

  const patch = useCallback(async (id: string, patchObj: Partial<PlantingRow>) => {
    // optimistic update always
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patchObj } : r)));

    const token = getStudioToken();

    // ✅ Local-only mode if token missing
    if (!token) {
      setLastError("Studio token missing — changes saved locally (not synced)");
      return;
    }

    const res = await fetch(`/api/plantings?id=${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-roseiies-studio-token": token,
      },
      body: JSON.stringify(patchObj),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("PATCH /api/plantings failed:", res.status, text);
      setLastError(text || `PATCH failed (HTTP ${res.status})`);
    }
  }, []);

  const byId = useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows]);

  return { rows, setRows, byId, loading, lastError, refresh, create, patch };
}