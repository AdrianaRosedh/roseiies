"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createBrowserSupabase } from "@roseiies/supabase/browser";
import type { GardenContext } from "../../hooks/useGardenContext";

export type GardenDashboardMetrics = {
  plantingsTotal: number;
  plantingsByStatus: Record<string, number>;

  careCount7d: number;
  careByType7d: Record<string, number>;
  laborMinutes7d: number;
  waterLiters7d: number;
  materialCost7dByCurrency: Record<string, number>;

  issuesCount14d: number;
  issuesByType14d: Record<string, number>;

  harvestCount7d: number;
  harvestTopItems7d: Array<{ name: string; qty: number; unit: string }>;
};

function empty(): GardenDashboardMetrics {
  return {
    plantingsTotal: 0,
    plantingsByStatus: {},

    careCount7d: 0,
    careByType7d: {},
    laborMinutes7d: 0,
    waterLiters7d: 0,
    materialCost7dByCurrency: {},

    issuesCount14d: 0,
    issuesByType14d: {},

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

/** localStorage cache key */
function metricsCacheKey(args: { tenantId: string; areaName: string }) {
  return `roseiies:garden:dashboard:metrics:v2:${args.tenantId}:${args.areaName}`;
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

export function useGardenDashboardMetrics(args: {
  tenantId: string;
  areaName: string;
  getCtx: () => Promise<GardenContext>;
}) {
  const supabase = useMemo(() => createBrowserSupabase(), []);

  const cacheKey = useMemo(
    () => metricsCacheKey({ tenantId: args.tenantId, areaName: args.areaName }),
    [args.tenantId, args.areaName]
  );

  const [metrics, setMetrics] = useState<GardenDashboardMetrics>(() => empty());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);

  const inflightRef = useRef<Promise<void> | null>(null);
  const lastRefreshAtRef = useRef<number>(0);
  const ctxRef = useRef<GardenContext | null>(null);

  // ✅ instant paint from cache
  useEffect(() => {
    if (!args.tenantId) return;
    const cached = loadCachedMetrics(cacheKey);
    if (cached) setMetrics(cached);
  }, [args.tenantId, cacheKey]);

  const getCtxOnce = useCallback(async () => {
    if (ctxRef.current) return ctxRef.current;
    const ctx = await args.getCtx();
    ctxRef.current = ctx;
    return ctx;
  }, [args]);

  const refresh = useCallback(
    async (opts?: { force?: boolean }) => {
      if (inflightRef.current) return inflightRef.current;

      const nowMs = Date.now();
      if (!opts?.force && nowMs - lastRefreshAtRef.current < 220) return;
      lastRefreshAtRef.current = nowMs;

      const run = (async () => {
        setLoading(true);
        setError(null);

        try {
          const ctx = await getCtxOnce();

          const now = new Date();
          const since7d = startOfDay(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));
          const since14d = startOfDay(new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000));

          const next = empty();

          // Plantings (workplace + area)
          {
            const { data, error } = await supabase
              .from("plantings")
              .select("id,status")
              .eq("workplace_id", ctx.workplaceId)
              .eq("area_id", ctx.areaId);

            if (error) throw error;

            const rows = Array.isArray(data) ? data : [];
            next.plantingsTotal = rows.length;

            for (const r of rows as any[]) {
              inc(next.plantingsByStatus, String(r.status ?? "unknown"), 1);
            }
          }

          // Care events (last 7d, workplace-wide)
          {
            const { data, error } = await supabase
              .from("care_events")
              .select("type,occurred_at,labor_minutes,water_liters,material_cost,currency")
              .eq("workplace_id", ctx.workplaceId)
              .gte("occurred_at", since7d.toISOString());

            if (error) throw error;

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

          // Issue events (last 14d, workplace-wide)
          {
            const { data, error } = await supabase
              .from("issue_events")
              .select("type,occurred_at")
              .eq("workplace_id", ctx.workplaceId)
              .gte("occurred_at", since14d.toISOString());

            if (error) throw error;

            const rows = Array.isArray(data) ? data : [];
            next.issuesCount14d = rows.length;

            for (const r of rows as any[]) {
              inc(next.issuesByType14d, String(r.type ?? "other"), 1);
            }
          }

          // Harvest events (last 7d) + item name join
          {
            const { data, error } = await supabase
              .from("harvest_events")
              .select("quantity,unit,item:items(name),occurred_at")
              .eq("workplace_id", ctx.workplaceId)
              .gte("occurred_at", since7d.toISOString());

            if (error) throw error;

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
              .map(([k, v]) => {
                const name = k.split("__")[0];
                return { name, qty: Math.round(v.qty * 100) / 100, unit: v.unit };
              })
              .sort((a, b) => b.qty - a.qty)
              .slice(0, 5);
          }

          setMetrics(next);
          saveCachedMetrics(cacheKey, next);
          setLastUpdatedAt(Date.now());
        } catch (e: any) {
          setError(e?.message ?? "Failed to load dashboard metrics");
        } finally {
          setLoading(false);
          inflightRef.current = null;
        }
      })();

      inflightRef.current = run;
      return run;
    },
    [supabase, cacheKey, getCtxOnce]
  );

  // initial load
  useEffect(() => {
    if (!args.tenantId) return;
    refresh({ force: true });
  }, [args.tenantId, refresh]);

  // ✅ realtime subscriptions (like usePlantings)
  useEffect(() => {
    if (!args.tenantId) return;

    let alive = true;
    let channel: any = null;
    let t: any = null;

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
          .channel(`roseiies:garden:dash:${args.tenantId}:${ctx.workplaceId}:${args.areaName}`)
          .on(
            "postgres_changes",
            { event: "*", schema: "roseiies", table: "plantings", filter: `workplace_id=eq.${ctx.workplaceId}` },
            (payload: any) => {
              const evt = String(payload?.eventType ?? "").toUpperCase();
              scheduleRefresh(evt === "UPDATE" ? 650 : 220);
            }
          )
          .on(
            "postgres_changes",
            { event: "*", schema: "roseiies", table: "care_events", filter: `workplace_id=eq.${ctx.workplaceId}` },
            () => scheduleRefresh(260)
          )
          .on(
            "postgres_changes",
            { event: "*", schema: "roseiies", table: "issue_events", filter: `workplace_id=eq.${ctx.workplaceId}` },
            () => scheduleRefresh(260)
          )
          .on(
            "postgres_changes",
            { event: "*", schema: "roseiies", table: "harvest_events", filter: `workplace_id=eq.${ctx.workplaceId}` },
            () => scheduleRefresh(260)
          )
          .subscribe();
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message ?? "Realtime subscription failed");
      }
    })();

    return () => {
      alive = false;
      if (t) clearTimeout(t);
      if (channel) supabase.removeChannel(channel);
    };
  }, [args.tenantId, args.areaName, supabase, getCtxOnce, refresh]);

  return {
    metrics,
    loading,
    error,
    refresh: () => refresh({ force: true }),
    lastUpdatedAt,
  };
}
