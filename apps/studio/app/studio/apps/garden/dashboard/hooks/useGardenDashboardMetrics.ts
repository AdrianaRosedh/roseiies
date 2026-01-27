// apps/studio/app/studio/apps/garden/dashboard/hooks/useGardenDashboardMetrics.ts
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createBrowserSupabase } from "@roseiies/supabase/browser";
import type { GardenContext } from "../../hooks/useGardenContext";

export type GardenDashboardMetrics = {
  plantingsTotal: number;
  plantingsByStatus: Record<string, number>;
  plantingsTrend7d: { days: string[]; counts: number[] };

  careCount7d: number;
  careByType7d: Record<string, number>;
  laborMinutes7d: number;
  waterLiters7d: number;
  materialCost7dByCurrency: Record<string, number>;

  issuesCount14d: number;
  issuesByType14d: Record<string, number>;
  issuesHeat14: { days: string[]; counts: number[] };

  harvestCount7d: number;
  harvestTopItems7d: Array<{ name: string; qty: number; unit: string }>;
};

export type LiveState = "connecting" | "live" | "offline";

type PlantingRowFromApi = {
  id: string;
  status: string | null;
  planted_at?: string | null;
};

function empty(): GardenDashboardMetrics {
  return {
    plantingsTotal: 0,
    plantingsByStatus: {},
    plantingsTrend7d: { days: [], counts: [] },

    careCount7d: 0,
    careByType7d: {},
    laborMinutes7d: 0,
    waterLiters7d: 0,
    materialCost7dByCurrency: {},

    issuesCount14d: 0,
    issuesByType14d: {},
    issuesHeat14: { days: [], counts: [] },

    harvestCount7d: 0,
    harvestTopItems7d: [],
  };
}

function inc(map: Record<string, number>, k: string, n = 1) {
  map[k] = (map[k] ?? 0) + n;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function fmtISO(d: Date) {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

function buildDays(end: Date, len: number) {
  const days: Date[] = [];
  const endDay = startOfDay(end);
  for (let i = len - 1; i >= 0; i--) {
    days.push(new Date(endDay.getTime() - i * 24 * 60 * 60 * 1000));
  }
  return days;
}

function metricsCacheKey(args: { tenantId: string; areaName: string }) {
  return `roseiies:garden:dashboard:metrics:v6:${args.tenantId}:${args.areaName}`;
}

function loadCachedMetrics(key: string): GardenDashboardMetrics | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as GardenDashboardMetrics) : null;
  } catch {
    return null;
  }
}

function saveCachedMetrics(key: string, metrics: GardenDashboardMetrics) {
  try {
    localStorage.setItem(key, JSON.stringify(metrics));
  } catch {}
}

async function fetchPlantingsViaApi(layoutId: string, signal?: AbortSignal) {
  const res = await fetch(`/api/plantings?layoutId=${encodeURIComponent(layoutId)}`, {
    signal,
    cache: "no-store",
    headers: { "cache-control": "no-cache" },
  });

  const text = await res.text();
  const json = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const msg = typeof json?.error === "string" ? json.error : text || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return (Array.isArray(json?.rows) ? json.rows : []) as PlantingRowFromApi[];
}

export function useGardenDashboardMetrics(args: {
  tenantId: string;
  areaName: string;
  getCtx: () => Promise<GardenContext>;
}) {
  const { tenantId, areaName, getCtx } = args;

  const supabase = useMemo(() => createBrowserSupabase(), []);
  const cacheKey = useMemo(() => metricsCacheKey({ tenantId, areaName }), [tenantId, areaName]);

  const [metrics, setMetrics] = useState<GardenDashboardMetrics>(() => empty());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [liveState, setLiveState] = useState<LiveState>("connecting");

  const inflightRef = useRef<Promise<void> | null>(null);
  const lastRefreshAtRef = useRef<number>(0);
  const ctxRef = useRef<GardenContext | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // cache paint
  useEffect(() => {
    if (!tenantId) return;
    const cached = loadCachedMetrics(cacheKey);
    if (cached) setMetrics(cached);
  }, [tenantId, cacheKey]);

  // reset ctx on tenant/area change
  useEffect(() => {
    ctxRef.current = null;
  }, [tenantId, areaName]);

  const getCtxOnce = useCallback(async () => {
    if (ctxRef.current) return ctxRef.current;
    const ctx = await getCtx();
    ctxRef.current = ctx;
    return ctx;
  }, [getCtx]);

  const refresh = useCallback(
    async (opts?: { force?: boolean }) => {
      if (!tenantId || !areaName) return;
      if (inflightRef.current) return inflightRef.current;

      const nowMs = Date.now();
      if (!opts?.force && nowMs - lastRefreshAtRef.current < 250) return;
      lastRefreshAtRef.current = nowMs;

      const run = (async () => {
        abortRef.current?.abort();
        const ac = new AbortController();
        abortRef.current = ac;

        setLoading(true);
        setError(null);

        try {
          const ctx = await getCtxOnce();
          const next = empty();

          // ✅ Plantings must match Sheets → use the same server API
          const plantings = await fetchPlantingsViaApi(ctx.layoutId, ac.signal);
          next.plantingsTotal = plantings.length;
          for (const r of plantings) {
            inc(next.plantingsByStatus, String(r.status ?? "unknown"), 1);
          }

          // ✅ Planted trend (7d) from planted_at
          {
            const days = buildDays(new Date(), 7);
            const dayKeys = days.map(fmtISO);
            const counts = dayKeys.map(() => 0);

            for (const p of plantings) {
              if (!p.planted_at) continue;
              const d = fmtISO(new Date(p.planted_at));
              const idx = dayKeys.indexOf(d);
              if (idx >= 0) counts[idx] += 1;
            }

            next.plantingsTrend7d = {
              days: days.map((d) => d.toLocaleDateString(undefined, { weekday: "short" })),
              counts,
            };
          }

          // Optional event panels (will populate once you log them & client has access)
          // If your dashboard is used while “Not signed in”, these may remain 0 unless you add server endpoints.
          try {
            const now = new Date();
            const since7d = startOfDay(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));
            const since14d = startOfDay(new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000));

            // care
            {
              const { data, error } = await supabase
                .from("care_events")
                .select("type,occurred_at,labor_minutes,water_liters,material_cost,currency")
                .eq("workplace_id", ctx.workplaceId)
                .gte("occurred_at", since7d.toISOString());

              if (!error) {
                const rows = Array.isArray(data) ? data : [];
                next.careCount7d = rows.length;

                for (const r of rows as any[]) {
                  inc(next.careByType7d, String(r.type ?? "other"), 1);
                  next.laborMinutes7d += Number(r.labor_minutes ?? 0) || 0;
                  next.waterLiters7d += Number(r.water_liters ?? 0) || 0;

                  const cost = Number(r.material_cost ?? 0) || 0;
                  if (cost) inc(next.materialCost7dByCurrency, String(r.currency ?? "MXN"), cost);
                }
              }
            }

            // issues + heat strip
            {
              const days = buildDays(new Date(), 14);
              const dayKeys = days.map(fmtISO);
              const counts = dayKeys.map(() => 0);

              const { data, error } = await supabase
                .from("issue_events")
                .select("type,occurred_at")
                .eq("workplace_id", ctx.workplaceId)
                .gte("occurred_at", since14d.toISOString());

              if (!error) {
                const rows = Array.isArray(data) ? data : [];
                next.issuesCount14d = rows.length;

                for (const r of rows as any[]) {
                  inc(next.issuesByType14d, String(r.type ?? "other"), 1);
                  if (r.occurred_at) {
                    const d = fmtISO(new Date(r.occurred_at));
                    const idx = dayKeys.indexOf(d);
                    if (idx >= 0) counts[idx] += 1;
                  }
                }
              }

              next.issuesHeat14 = { days: dayKeys, counts };
            }

            // harvest
            {
              const { data, error } = await supabase
                .from("harvest_events")
                .select("quantity,unit,item:items(name),occurred_at")
                .eq("workplace_id", ctx.workplaceId)
                .gte("occurred_at", since7d.toISOString());

              if (!error) {
                const rows = Array.isArray(data) ? data : [];
                next.harvestCount7d = rows.length;

                const agg = new Map<string, { qty: number; unit: string }>();
                for (const r of rows as any[]) {
                  const name = String(r.item?.name ?? "Unknown");
                  const unit = String(r.unit ?? "kg");
                  const qty = Number(r.quantity ?? 0) || 0;
                  const key = `${name}__${unit}`;
                  const prev = agg.get(key) ?? { qty: 0, unit };
                  prev.qty += qty;
                  agg.set(key, prev);
                }

                next.harvestTopItems7d = Array.from(agg.entries())
                  .map(([k, v]) => ({ name: k.split("__")[0], qty: Math.round(v.qty * 100) / 100, unit: v.unit }))
                  .sort((a, b) => b.qty - a.qty)
                  .slice(0, 5);
              }
            }
          } catch {
            // keep event panels calm if not available
          }

          setMetrics(next);
          saveCachedMetrics(cacheKey, next);
        } catch (e: any) {
          if (e?.name !== "AbortError") setError(e?.message ?? "Failed to load dashboard metrics");
        } finally {
          setLoading(false);
          inflightRef.current = null;
        }
      })();

      inflightRef.current = run;
      return run;
    },
    [tenantId, areaName, cacheKey, getCtxOnce, supabase]
  );

  // initial load
  useEffect(() => {
    if (!tenantId || !areaName) return;
    refresh({ force: true });
  }, [tenantId, areaName, refresh]);

  // realtime -> refresh + live state
  useEffect(() => {
    if (!tenantId || !areaName) return;

    let alive = true;
    let channel: any = null;
    let t: any = null;

    setLiveState("connecting");

    const scheduleRefresh = (delay = 200) => {
      if (t) clearTimeout(t);
      t = setTimeout(() => {
        if (!alive) return;
        refresh();
      }, delay);
    };

    (async () => {
      try {
        const ctx = await getCtxOnce();
        if (!alive) return;

        channel = supabase
          .channel(`roseiies:garden:dash:${tenantId}:${ctx.workplaceId}:${areaName}`)
          .on(
            "postgres_changes",
            { event: "*", schema: "roseiies", table: "plantings", filter: `workplace_id=eq.${ctx.workplaceId}` },
            (payload: any) => {
              const evt = String(payload?.eventType ?? "").toUpperCase();
              scheduleRefresh(evt === "UPDATE" ? 650 : 180);
            }
          )
          .subscribe((status: string) => {
            if (!alive) return;
            if (status === "SUBSCRIBED") setLiveState("live");
            else if (status === "CHANNEL_ERROR" || status === "CLOSED") setLiveState("offline");
            else setLiveState("connecting");
          });
      } catch (e: any) {
        if (!alive) return;
        setLiveState("offline");
        setError(e?.message ?? "Realtime subscription failed");
      }
    })();

    return () => {
      alive = false;
      if (t) clearTimeout(t);
      if (channel) supabase.removeChannel(channel);
      setLiveState("offline");
    };
  }, [tenantId, areaName, supabase, getCtxOnce, refresh]);

  // silent poll fallback (keeps it fresh even if realtime drops)
  useEffect(() => {
    if (!tenantId || !areaName) return;

    const tick = () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      refresh();
    };

    const warm = setTimeout(tick, 1200);
    const id = setInterval(tick, 30_000);

    return () => {
      clearTimeout(warm);
      clearInterval(id);
    };
  }, [tenantId, areaName, refresh]);

  return { metrics, loading, error, liveState };
}
