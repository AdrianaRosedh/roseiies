// apps/studio/app/studio/apps/garden/dashboard/GardenDashboardPanels.tsx
"use client";

import React, { useMemo } from "react";

import DashboardPanel from "@/app/studio/editor-core/dashboard/components/DashboardPanel";
import DashboardGrid from "@/app/studio/editor-core/dashboard/components/DashboardGrid";
import KpiStat from "@/app/studio/editor-core/dashboard/components/KpiStat";
import Pill from "@/app/studio/editor-core/dashboard/components/Pill";

import { useGardenContext } from "../hooks/useGardenContext";
import { useGardenDashboardMetrics } from "./hooks/useGardenDashboardMetrics";

function fmtMoneyPairs(map: Record<string, number>) {
  const entries = Object.entries(map).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return "—";
  return entries.map(([cur, v]) => `${cur} ${Math.round(v * 100) / 100}`).join(" · ");
}

export default function GardenDashboardPanels(props: {
  tenantId: string;
  areaName: string | null;
}) {
  const { getCtx, areaName } = useGardenContext({ areaName: props.areaName });

  const { metrics, loading, error, refresh, lastUpdatedAt } = useGardenDashboardMetrics({
    tenantId: props.tenantId,
    areaName,
    getCtx,
  });

  const plantingStatusChips = useMemo(() => {
    const order = ["planned", "active", "harvested", "failed", "archived"];
    return order
      .filter((k) => (metrics.plantingsByStatus[k] ?? 0) > 0)
      .map((k) => ({ k, v: metrics.plantingsByStatus[k] ?? 0 }));
  }, [metrics.plantingsByStatus]);

  const careTypes = useMemo(() => {
    return Object.entries(metrics.careByType7d)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [metrics.careByType7d]);

  const issueTypes = useMemo(() => {
    return Object.entries(metrics.issuesByType14d)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [metrics.issuesByType14d]);

  const actionRight = (
    <div className="flex items-center gap-2 min-w-0">
      {loading ? <span className="text-xs text-black/40">Loading…</span> : null}
      {error ? <span className="text-xs text-red-700/70 truncate">{error}</span> : null}
      {lastUpdatedAt ? (
        <span className="text-xs text-black/35 hidden md:inline">
          · {new Date(lastUpdatedAt).toLocaleTimeString()}
        </span>
      ) : null}
      <button
        type="button"
        onClick={refresh}
        className="rounded-lg border border-black/10 bg-white/70 px-2 py-1 text-xs hover:bg-black/5"
      >
        Refresh
      </button>
    </div>
  );

  return (
    <DashboardGrid cols={2}>
      <DashboardPanel title="Plantings overview" right={actionRight}>
        <div className="grid grid-cols-2 gap-2">
          <KpiStat label="Total plantings" value={metrics.plantingsTotal} />
          <KpiStat label="Active" value={metrics.plantingsByStatus["active"] ?? 0} />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Pill label="total" value={metrics.plantingsTotal} />
          {plantingStatusChips.map((x) => (
            <Pill key={x.k} label={x.k} value={x.v} />
          ))}
          {!plantingStatusChips.length ? (
            <span className="text-sm text-black/40">No plantings yet.</span>
          ) : null}
        </div>
      </DashboardPanel>

      <DashboardPanel title="Care — last 7 days">
        <div className="grid grid-cols-2 gap-2">
          <KpiStat label="Events" value={metrics.careCount7d} />
          <KpiStat label="Labor (min)" value={Math.round(metrics.laborMinutes7d)} />
          <KpiStat label="Water (L)" value={Math.round(metrics.waterLiters7d)} />
          <KpiStat label="Material cost" value={fmtMoneyPairs(metrics.materialCost7dByCurrency)} />
        </div>

        <div className="mt-3">
          <div className="text-xs font-medium text-black/55">Top types</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {careTypes.length ? (
              careTypes.map(([t, n]) => <Pill key={t} label={t} value={n} />)
            ) : (
              <span className="text-sm text-black/40">No care logged.</span>
            )}
          </div>
        </div>
      </DashboardPanel>

      <DashboardPanel title="Issues — last 14 days">
        <div className="grid grid-cols-2 gap-2">
          <KpiStat label="Issues" value={metrics.issuesCount14d} />
          <KpiStat
            label="Top type"
            value={issueTypes.length ? issueTypes[0][0] : "—"}
            hint={issueTypes.length ? `${issueTypes[0][1]} events` : undefined}
          />
        </div>

        <div className="mt-3">
          <div className="text-xs font-medium text-black/55">By type</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {issueTypes.length ? (
              issueTypes.map(([t, n]) => <Pill key={t} label={t} value={n} />)
            ) : (
              <span className="text-sm text-black/40">No issues logged.</span>
            )}
          </div>
        </div>
      </DashboardPanel>

      <DashboardPanel title="Harvest — last 7 days">
        <div className="grid grid-cols-2 gap-2">
          <KpiStat label="Harvest events" value={metrics.harvestCount7d} />
          <KpiStat label="Top items" value={metrics.harvestTopItems7d.length} />
        </div>

        <div className="mt-3">
          {metrics.harvestTopItems7d.length ? (
            <ul className="text-sm text-black/45 space-y-2">
              {metrics.harvestTopItems7d.map(
                (it: { name: string; qty: number; unit: string }) => (
                  <li key={`${it.name}:${it.unit}`} className="flex justify-between gap-3">
                    <span className="truncate">• {it.name}</span>
                    <span className="text-black/60 shrink-0">
                      {it.qty} {it.unit}
                    </span>
                  </li>
                )
              )}
            </ul>
          ) : (
            <span className="text-sm text-black/40">No harvest logged.</span>
          )}
        </div>
      </DashboardPanel>
    </DashboardGrid>
  );
}
