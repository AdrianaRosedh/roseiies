// apps/studio/app/studio/apps/garden/GardenStore.tsx
"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createBrowserSupabase } from "@roseiies/supabase/browser";
import type { PlantingRow as SheetsPlantingRow } from "./sheets/types"; // matches your sheets row type

export type GardenContext = {
  workplaceId: string;
  areaId: string;
  layoutId: string;
  workplaceSlug: string;
  areaName: string;
};

type PlantingRow = SheetsPlantingRow;

type StoreState = {
  rows: PlantingRow[];
  byId: Map<string, PlantingRow>;
  loading: boolean;
  lastError: string | null;
  ctx: GardenContext | null;
  ready: boolean; // cache loaded + first warmup kicked off
};

type StoreApi = StoreState & {
  refresh: (opts?: { force?: boolean }) => Promise<void>;
  setRows: (rows: PlantingRow[]) => void;

  // optimistic helpers (Airtable feel)
  optimisticPatch: (id: string, patch: Partial<PlantingRow>) => void;
  notePatched: (id: string) => void;
};

const GardenStoreContext = createContext<StoreApi | null>(null);

function safeAreaName(raw: string | null) {
  const s = String(raw ?? "").trim();
  return s.length ? s : "Garden";
}

// --- cache keys (must match what your hooks already used)
function sheetsCacheKey(tenantId: string, gardenName: string) {
  return `roseiies:garden:plantings:rows:v2:${tenantId}:${gardenName}`;
}
function designerCacheKey(tenantId: string, gardenName: string) {
  return `roseiies:garden:plantings:designer:v2:${tenantId}:${gardenName}`;
}

// --- local cache helpers
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

// --- asset warmup (trees + bed textures)
function preloadImages(srcs: string[]) {
  for (const src of srcs) {
    const img = new Image();
    img.decoding = "async";
    img.loading = "eager";
    img.src = src;
  }
}

/**
 * Konva warm-up:
 * - forces the browser to decode images early
 * - then schedules a tiny idle "GPU warm" pass (no DOM needed)
 */
function warmKonvaRuntime() {
  // keep it safe + non-blocking
  const run = () => {
    // Touch canvas once to warm compositing pipeline
    const c = document.createElement("canvas");
    c.width = 2;
    c.height = 2;
    const ctx = c.getContext("2d");
    if (ctx) ctx.fillRect(0, 0, 1, 1);
  };

  // requestIdleCallback if available
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ric = (window as any).requestIdleCallback as undefined | ((cb: () => void) => void);

  if (ric) ric(run);
  else setTimeout(run, 0);
}

// --- network
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

async function fetchPlantings(layoutId: string, signal?: AbortSignal) {
  const res = await fetch(`/api/plantings?layoutId=${encodeURIComponent(layoutId)}`, {
    signal,
    cache: "no-store",
    headers: { "cache-control": "no-cache" },
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(json?.error ?? text ?? `plantings failed (${res.status})`);
  return (Array.isArray(json?.rows) ? json.rows : []) as PlantingRow[];
}

export function GardenStoreProvider(props: {
  tenantId: string;
  gardenName: string | null;
  children: React.ReactNode;
}) {
  const tenantId = props.tenantId;
  const gardenName = safeAreaName(props.gardenName);

  const [rows, setRowsState] = useState<PlantingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [ctx, setCtx] = useState<GardenContext | null>(null);
  const [ready, setReady] = useState(false);

  const byId = useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows]);

  const ctxRef = useRef<{ key: string; ctx: GardenContext } | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const inflightRef = useRef<Promise<void> | null>(null);
  const lastRefreshAtRef = useRef<number>(0);

  // realtime echo suppression (when we PATCH optimistically)
  const justPatchedRef = useRef<Map<string, number>>(new Map());
  const skipRealtimeUpdateWindowMs = 1200;

  const setRows = useCallback(
    (next: PlantingRow[]) => {
      setRowsState(next);
      // write-through both caches so Map + Sheets paint instantly
      saveCachedRows(sheetsCacheKey(tenantId, gardenName), next);
      saveCachedRows(designerCacheKey(tenantId, gardenName), next);
    },
    [tenantId, gardenName]
  );

  const getCtx = useCallback(async () => {
    const cached = ctxRef.current;
    if (cached && cached.key === gardenName) return cached.ctx;
    const c = await fetchGardenContext(gardenName);
    ctxRef.current = { key: gardenName, ctx: c };
    setCtx(c);
    return c;
  }, [gardenName]);

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
          const c = await getCtx();
          const next = await fetchPlantings(c.layoutId, ac.signal);
          // keep UI stable: only update if needed
          setRowsState((prev) => {
            if (prev.length === next.length) {
              let same = true;
              for (let i = 0; i < prev.length; i++) {
                const a: any = prev[i];
                const b: any = next[i];
                if (
                  a.id !== b.id ||
                  a.status !== b.status ||
                  a.planted_at !== b.planted_at ||
                  a.pin_x !== b.pin_x ||
                  a.pin_y !== b.pin_y ||
                  a.bed_id !== b.bed_id ||
                  a.zone_code !== b.zone_code ||
                  a.crop !== b.crop
                ) {
                  same = false;
                  break;
                }
              }
              if (same) return prev;
            }
            // write-through caches
            saveCachedRows(sheetsCacheKey(tenantId, gardenName), next);
            saveCachedRows(designerCacheKey(tenantId, gardenName), next);
            return next;
          });
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
    [getCtx, tenantId, gardenName]
  );

  const optimisticPatch = useCallback(
    (id: string, patch: Partial<PlantingRow>) => {
      setRowsState((prev) => {
        const next = prev.map((r) => (r.id === id ? { ...r, ...patch } : r));
        saveCachedRows(sheetsCacheKey(tenantId, gardenName), next);
        saveCachedRows(designerCacheKey(tenantId, gardenName), next);
        return next;
      });
    },
    [tenantId, gardenName]
  );

  const notePatched = useCallback((id: string) => {
    justPatchedRef.current.set(id, Date.now());
  }, []);

  // 1) Instant paint from cache + kick warmup
  useEffect(() => {
    // load cached rows immediately (instant UI)
    const cached =
      loadCachedRows(sheetsCacheKey(tenantId, gardenName)) ||
      loadCachedRows(designerCacheKey(tenantId, gardenName));

    if (cached.length) setRowsState(cached);

    // preload assets immediately on entering Garden
    preloadImages([
      // trees
      "/images/trees/tree-01.svg",
      "/images/trees/tree-02.svg",
      "/images/trees/tree-03.svg",
      "/images/trees/tree-04.svg",
      "/images/trees/citrus.svg",

      // ✅ bed / soil textures (update these to your actual texture paths)
      // If your useTextures hook points elsewhere, mirror those paths here.
      "/images/textures/soil.jpg",
      "/images/textures/soil-wet.jpg",
      "/images/textures/dirt.png",
    ]);

    warmKonvaRuntime();

    // after initial cache paint, background refresh
    refresh();

    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, gardenName]);

  // 2) Realtime once we have ctx
  useEffect(() => {
    let alive = true;
    const supabase = createBrowserSupabase();
    let channel: any = null;
    let t: any = null;

    const scheduleRefresh = (delay = 180) => {
      if (t) clearTimeout(t);
      t = setTimeout(() => {
        if (!alive) return;
        refresh();
      }, delay);
    };

    (async () => {
      try {
        const c = await getCtx();
        if (!alive) return;

        channel = supabase
          .channel(`roseiies:garden:plantings:store:${tenantId}:${c.workplaceId}:${gardenName}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "roseiies",
              table: "plantings",
              filter: `workplace_id=eq.${c.workplaceId}`,
            },
            (payload: any) => {
              const evt = String(payload?.eventType ?? "").toUpperCase();

              if (evt === "UPDATE") {
                const id = String(payload?.new?.id ?? payload?.old?.id ?? "");
                const ts = id ? justPatchedRef.current.get(id) : undefined;
                if (ts && Date.now() - ts < skipRealtimeUpdateWindowMs) return;

                // background reconcile (slow)
                scheduleRefresh(650);
                return;
              }

              // INSERT/DELETE: do quicker refresh
              scheduleRefresh(160);
            }
          )
          .subscribe();
      } catch {
        // ignore; store should never hard-fail UI
      }
    })();

    return () => {
      alive = false;
      if (t) clearTimeout(t);
      if (channel) supabase.removeChannel(channel);
    };
  }, [tenantId, gardenName, getCtx, refresh]);

  const api: StoreApi = useMemo(
    () => ({
      rows,
      byId,
      loading,
      lastError,
      ctx,
      ready,
      refresh,
      setRows,
      optimisticPatch,
      notePatched,
    }),
    [rows, byId, loading, lastError, ctx, ready, refresh, setRows, optimisticPatch, notePatched]
  );

  return <GardenStoreContext.Provider value={api}>{props.children}</GardenStoreContext.Provider>;
}

export function useGardenStore() {
  const v = useContext(GardenStoreContext);
  if (!v) throw new Error("useGardenStore must be used inside <GardenStoreProvider>");
  return v;
}
