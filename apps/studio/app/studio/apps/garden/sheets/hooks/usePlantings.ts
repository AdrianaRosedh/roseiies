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
    `/api/garden-context?workplaceSlug=olivea&areaName=${encodeURIComponent(areaName)}`,
    { cache: "no-store" }
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

// local cache (instant paint)
function rowsCacheKey(args: { tenantId: string; areaName: string }) {
  return `roseiies:garden:plantings:rows:v2:${args.tenantId}:${args.areaName}`;
}
function loadCachedRows(key: string): PlantingRow[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PlantingRow[]) : [];
  } catch {
    return [];
  }
}
function saveCachedRows(key: string, rows: PlantingRow[]) {
  try {
    localStorage.setItem(key, JSON.stringify(rows));
  } catch {}
}

export function usePlantings(args: { gardenName: string | null; tenantId: string }) {
  const { tenantId } = args;

  // IMPORTANT: in this hook, gardenName is actually DB areaName
  const areaName = safeAreaName(args.gardenName);

  const [rows, setRows] = useState<PlantingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const cacheKey = useMemo(() => rowsCacheKey({ tenantId, areaName }), [tenantId, areaName]);

  // Cache context per areaName
  const ctxRef = useRef<{ key: string; ctx: GardenContext } | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const inflightRef = useRef<Promise<void> | null>(null);
  const lastRefreshAtRef = useRef<number>(0);

  // instant paint from cache
  useEffect(() => {
    if (!tenantId) return;
    const cached = loadCachedRows(cacheKey);
    if (cached.length) setRows(cached);
  }, [tenantId, cacheKey]);

  const getCtx = useCallback(async () => {
    const cached = ctxRef.current;
    if (cached && cached.key === areaName) return cached.ctx;
    const ctx = await fetchGardenContext(areaName);
    ctxRef.current = { key: areaName, ctx };
    return ctx;
  }, [areaName]);

  const refresh = useCallback(
    async (opts?: { force?: boolean }) => {
      if (inflightRef.current) return inflightRef.current;

      const now = Date.now();
      if (!opts?.force && now - lastRefreshAtRef.current < 220) return;
      lastRefreshAtRef.current = now;

      const run = (async () => {
        abortRef.current?.abort();
        const ac = new AbortController();
        abortRef.current = ac;

        setLoading(true);
        setLastError(null);

        try {
          const ctx = await getCtx();

          const res = await fetch(`/api/plantings?layoutId=${encodeURIComponent(ctx.layoutId)}`, {
            signal: ac.signal,
            cache: "no-store",
            headers: { "cache-control": "no-cache" },
          });

          const text = await res.text();
          const json = text ? JSON.parse(text) : null;

          if (!res.ok) {
            const msg = typeof json?.error === "string" ? json.error : text || `HTTP ${res.status}`;
            setLastError(msg);
            return;
          }

          const nextRows = (Array.isArray(json?.rows) ? json.rows : []) as PlantingRow[];
          setRows(nextRows);
          saveCachedRows(cacheKey, nextRows);
        } catch (e: any) {
          if (e?.name !== "AbortError") setLastError(e?.message ?? "Failed to load plantings");
        } finally {
          setLoading(false);
          inflightRef.current = null;
        }
      })();

      inflightRef.current = run;
      return run;
    },
    [getCtx, cacheKey]
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Realtime: subscribe once ctx is available
  useEffect(() => {
    if (!tenantId) return;

    let alive = true;
    const supabase = createBrowserSupabase();
    let channel: any = null;
    let t: any = null;

    const scheduleRefresh = (delay = 180) => {
      if (t) clearTimeout(t);
      t = setTimeout(() => refresh(), delay);
    };

    (async () => {
      try {
        const ctx = await getCtx();
        if (!alive) return;

        channel = supabase
          .channel(`roseiies:plantings:sheets:${tenantId}:${ctx.workplaceId}:${areaName}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "roseiies",
              table: "plantings",
              filter: `workplace_id=eq.${ctx.workplaceId}`,
            },
            (payload: any) => {
              const evt = String(payload?.eventType ?? "").toUpperCase();
              scheduleRefresh(evt === "UPDATE" ? 650 : 140);
            }
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
  }, [tenantId, areaName, getCtx, refresh]);

  const create = useCallback(
    async (draft: Omit<PlantingRow, "id">) => {
      const token = getStudioToken();
      if (!token) throw new Error("Missing NEXT_PUBLIC_ROSEIIES_STUDIO_TOKEN");

      const ctx = await getCtx();

      const payload = {
        workplaceSlug: "olivea",
        areaName, // DB areaName
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
        const msg = typeof json?.error === "string" ? json.error : text || `HTTP ${res.status}`;
        setLastError(msg);
        throw new Error(msg);
      }

      setLastError(null);
      queueMicrotask(() => refresh({ force: true }));
      return json as PlantingRow;
    },
    [areaName, getCtx, refresh]
  );

  const patch = useCallback(
    async (id: string, patchObj: Partial<PlantingRow>) => {
      // optimistic
      setRows((prev) => {
        const next = prev.map((r) => (r.id === id ? { ...r, ...patchObj } : r));
        saveCachedRows(cacheKey, next);
        return next;
      });

      const token = getStudioToken();
      if (!token) {
        setLastError("Studio token missing — changes saved locally (not synced)");
        return;
      }

      let payload: any = patchObj;

      try {
        const ctx = await getCtx();
        payload = { ...patchObj, workplaceSlug: "olivea", areaName, layoutId: ctx.layoutId };
      } catch {}

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
        setLastError(text || `PATCH failed (HTTP ${res.status})`);
        refresh({ force: true });
      } else {
        setLastError(null);
        queueMicrotask(() => refresh());
      }
    },
    [areaName, getCtx, cacheKey, refresh]
  );
  
  const softDelete = useCallback(async (id: string) => {
    return patch(id, { deleted: true } as any);
  }, [patch]);

  const restore = useCallback(async (id: string) => {
    return patch(id, { deleted: false } as any);
  }, [patch]);

  const byId = useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows]);

  return { rows, setRows, byId, loading, lastError, refresh: () => refresh({ force: true }), create, patch, softDelete, restore };

}
