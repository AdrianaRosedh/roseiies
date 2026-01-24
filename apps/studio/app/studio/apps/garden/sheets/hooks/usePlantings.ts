// apps/studio/app/studio/apps/garden/sheets/hooks/usePlantings.ts
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PlantingRow } from "../types";
import { createBrowserSupabase } from "@roseiies/supabase/browser";

function getStudioToken(): string | null {
  const t = process.env.NEXT_PUBLIC_ROSEIIES_STUDIO_TOKEN;
  if (!t || t.trim() === "") return null;
  return t.trim();
}

function upsertById(prev: PlantingRow[], row: PlantingRow) {
  const idx = prev.findIndex((r) => r.id === row.id);
  if (idx === -1) return [row, ...prev];
  const next = [...prev];
  next[idx] = { ...next[idx], ...row };
  return next;
}

export function usePlantings(args: { gardenName: string | null; tenantId: string }) {
  const { gardenName, tenantId } = args;

  const [rows, setRows] = useState<PlantingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  // once we have data, we can learn the garden_id from rows (API now includes it)
  const gardenIdRef = useRef<string | null>(null);
  useEffect(() => {
    const gid = (rows as any)?.[0]?.garden_id ?? null;
    if (gid && typeof gid === "string") gardenIdRef.current = gid;
  }, [rows]);

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

  // ✅ Realtime: incremental updates (fallback to refresh if we can’t confidently filter)
  useEffect(() => {
    if (!tenantId) return;

    const supabase = createBrowserSupabase();

    let t: any = null;
    const scheduleRefresh = () => {
      if (t) clearTimeout(t);
      t = setTimeout(() => refresh(), 120);
    };

    const channel = supabase
      .channel(`garden_plantings:sheets:${tenantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "garden_plantings",
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload: any) => {
          const evt = String(payload?.eventType ?? "").toUpperCase();
          const next = payload?.new as any;
          const prev = payload?.old as any;

          const activeGardenId = gardenIdRef.current;

          // If we don’t know garden_id yet (empty table), safest is refresh.
          if (!activeGardenId) return scheduleRefresh();

          const newGarden = next?.garden_id ?? null;
          const oldGarden = prev?.garden_id ?? null;

          const touchesActive = newGarden === activeGardenId || oldGarden === activeGardenId;
          if (!touchesActive) return;

          setRows((prevRows) => {
            if (evt === "DELETE") {
              const id = String(prev?.id ?? "");
              return prevRows.filter((r) => r.id !== id);
            }

            if (evt === "INSERT" || evt === "UPDATE") {
              const row: any = {
                id: String(next?.id),
                bed_id: next?.bed_id ?? null,
                zone_code: next?.zone_code ?? null,
                crop: next?.crop ?? null,
                status: next?.status ?? null,
                planted_at: next?.planted_at ?? null,
                pin_x: next?.pin_x ?? null,
                pin_y: next?.pin_y ?? null,
                garden_id: next?.garden_id ?? null,
                created_at: next?.created_at ?? null,
              };
              return upsertById(prevRows, row as PlantingRow);
            }

            return prevRows;
          });
        }
      )
      .subscribe();

    return () => {
      if (t) clearTimeout(t);
      supabase.removeChannel(channel);
    };
  }, [tenantId, refresh]);

  /**
   * IMPORTANT:
   * create() is PURE:
   * - returns created row
   * - does NOT modify rows state
   * The caller (Sheets model) owns optimistic insertion + replacement.
   */
  const create = useCallback(
    async (draft: Omit<PlantingRow, "id">) => {
      if (!gardenName) throw new Error("Missing gardenName");

      const token = getStudioToken();
      if (!token) throw new Error("Missing NEXT_PUBLIC_ROSEIIES_STUDIO_TOKEN");

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
        throw new Error(msg);
      }

      setLastError(null);
      return json as PlantingRow;
    },
    [gardenName]
  );

  /**
   * patch() stays optimistic and MUST NOT throw.
   */
  const patch = useCallback(async (id: string, patchObj: Partial<PlantingRow>) => {
    // optimistic update always
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patchObj } : r)));

    const token = getStudioToken();
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
    } else {
      setLastError(null);
    }
  }, []);

  const byId = useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows]);

  return { rows, setRows, byId, loading, lastError, refresh, create, patch };
}