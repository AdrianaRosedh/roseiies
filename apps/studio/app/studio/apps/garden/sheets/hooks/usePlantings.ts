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

type GardenContext = {
  workplaceId: string;
  areaId: string;
  layoutId: string;
  workplaceSlug: string;
  areaName: string;
};

async function fetchGardenContext(areaName: string) {
  const res = await fetch(
    `/api/garden-context?workplaceSlug=olivea&areaName=${encodeURIComponent(areaName)}`
  );
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(json?.error ?? text ?? `garden-context failed (${res.status})`);
  return json as GardenContext;
}

function safeAreaName(raw: string | null) {
  const s = String(raw ?? "").trim();
  return s.length ? s : "Garden";
}

export function usePlantings(args: { gardenName: string | null; tenantId: string }) {
  const { tenantId } = args;
  const gardenName = safeAreaName(args.gardenName);

  const [rows, setRows] = useState<PlantingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  // Cache context per gardenName (areaName)
  const ctxRef = useRef<{ key: string; ctx: GardenContext } | null>(null);

  const getCtx = useCallback(async () => {
    const cached = ctxRef.current;
    if (cached && cached.key === gardenName) return cached.ctx;
    const ctx = await fetchGardenContext(gardenName);
    ctxRef.current = { key: gardenName, ctx };
    return ctx;
  }, [gardenName]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setLastError(null);

    try {
      const ctx = await getCtx();

      const res = await fetch(`/api/plantings?layoutId=${encodeURIComponent(ctx.layoutId)}`);
      const text = await res.text();
      const json = text ? JSON.parse(text) : null;

      if (!res.ok) {
        const msg =
          typeof json?.error === "string" ? json.error : text || `HTTP ${res.status}`;
        setLastError(msg);
        // Do not wipe rows on transient errors; keep last known good state
        return;
      }

      const nextRows = (Array.isArray(json?.rows) ? json.rows : []) as PlantingRow[];
      setRows(nextRows);
    } catch (e: any) {
      setLastError(e?.message ?? "Failed to load plantings");
      // Keep last known good rows
    } finally {
      setLoading(false);
    }
  }, [getCtx]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Realtime: subscribe once context is available. If ctx changes (gardenName), resubscribe.
  useEffect(() => {
    if (!tenantId) return;

    let alive = true;
    const supabase = createBrowserSupabase();

    let channel: any = null;
    let t: any = null;

    const scheduleRefresh = () => {
      if (t) clearTimeout(t);
      t = setTimeout(() => refresh(), 140);
    };

    (async () => {
      try {
        const ctx = await getCtx();
        if (!alive) return;

        channel = supabase
          .channel(`roseiies:plantings:sheets:${tenantId}:${ctx.workplaceId}:${gardenName}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "roseiies",
              table: "plantings",
              filter: `workplace_id=eq.${ctx.workplaceId}`,
            },
            () => scheduleRefresh()
          )
          .subscribe();
      } catch (e: any) {
        if (!alive) return;
        setLastError(e?.message ?? "Realtime subscription failed");
      }
    })();

    return () => {
      alive = false;
      if (t) clearTimeout(t);
      if (channel) supabase.removeChannel(channel);
    };
  }, [tenantId, gardenName, getCtx, refresh]);

  /**
   * create() returns created row; does NOT mutate rows state (caller owns optimistic UI).
   */
  const create = useCallback(
    async (draft: Omit<PlantingRow, "id">) => {
      const token = getStudioToken();
      if (!token) throw new Error("Missing NEXT_PUBLIC_ROSEIIES_STUDIO_TOKEN");

      const ctx = await getCtx();

      const payload = {
        workplaceSlug: "olivea",
        areaName: gardenName,
        layoutId: ctx.layoutId,
        ...draft,
      };

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
        const msg =
          typeof json?.error === "string" ? json.error : text || `HTTP ${res.status}`;
        setLastError(msg);
        throw new Error(msg);
      }

      setLastError(null);
      return json as PlantingRow;
    },
    [gardenName, getCtx]
  );

  /**
   * patch() optimistic and MUST NOT throw.
   */
  const patch = useCallback(
    async (id: string, patchObj: Partial<PlantingRow>) => {
      // optimistic UI
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patchObj } : r)));

      const token = getStudioToken();
      if (!token) {
        setLastError("Studio token missing — changes saved locally (not synced)");
        return;
      }

      let payload: any = patchObj;

      try {
        const ctx = await getCtx();
        payload = {
          ...patchObj,
          workplaceSlug: "olivea",
          areaName: gardenName,
          layoutId: ctx.layoutId,
        };
      } catch {
        // If context fails, still try patch with raw patchObj
      }

      const res = await fetch(`/api/plantings?id=${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-roseiies-studio-token": token,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error("PATCH /api/plantings failed:", res.status, text);
        setLastError(text || `PATCH failed (HTTP ${res.status})`);
      } else {
        setLastError(null);
      }
    },
    [gardenName, getCtx]
  );

  const byId = useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows]);

  return { rows, setRows, byId, loading, lastError, refresh, create, patch };
}