// apps/studio/app/studio/apps/garden/dashboard/GardenDashboardPanels.tsx
"use client";

import React, { useMemo } from "react";

import DashboardPanel from "@/app/studio/editor-core/dashboard/components/DashboardPanel";
import DashboardGrid from "@/app/studio/editor-core/dashboard/components/DashboardGrid";
import KpiStat from "@/app/studio/editor-core/dashboard/components/KpiStat";
import Pill from "@/app/studio/editor-core/dashboard/components/Pill";

import Sparkline from "./components/Sparkline";
import HeatStrip14 from "./components/HeatStrip14";

import type { GardenDashboardMetrics } from "./hooks/useGardenDashboardMetrics";

function fmtMoneyPairs(map: Record<string, number>) {
  const entries = Object.entries(map).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return "—";
  return entries.map(([cur, v]) => `${cur} ${Math.round(v * 100) / 100}`).join(" · ");
}

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function labelTone(label: string) {
  const k = label.toLowerCase();
  if (k.includes("active")) return "stroke-emerald-500";
  if (k.includes("planned")) return "stroke-sky-500";
  if (k.includes("harvest")) return "stroke-amber-500";
  if (k.includes("failed")) return "stroke-rose-500";
  if (k.includes("arch")) return "stroke-slate-400";
  return "stroke-black/35";
}

function MiniDonut(props: {
  size?: number;
  stroke?: number;
  segments: Array<{ label: string; value: number }>;
  title?: string;
}) {
  const size = props.size ?? 54;
  const stroke = props.stroke ?? 8;

  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  const total = props.segments.reduce((s, x) => s + (Number(x.value) || 0), 0);

  if (!total) {
    return (
      <div className="flex items-center justify-center" title={props.title}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" className="stroke-black/10" strokeWidth={stroke} />
        </svg>
      </div>
    );
  }

  let offset = 0;

  return (
    <div className="flex items-center justify-center" title={props.title}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" className="stroke-black/10" strokeWidth={stroke} />
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {props.segments
            .filter((s) => (Number(s.value) || 0) > 0)
            .map((seg) => {
              const v = Number(seg.value) || 0;
              const dash = (v / total) * c;
              const el = (
                <circle
                  key={seg.label}
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  fill="none"
                  className={cn("transition-all duration-300", labelTone(seg.label))}
                  strokeWidth={stroke}
                  strokeLinecap="round"
                  strokeDasharray={`${dash} ${c - dash}`}
                  strokeDashoffset={-offset}
                />
              );
              offset += dash;
              return el;
            })}
        </g>
      </svg>
    </div>
  );
}

function BarList(props: {
  items: Array<{ label: string; value: number; right?: string }>;
  maxItems?: number;
  emptyText?: string;
}) {
  const maxItems = props.maxItems ?? 6;

  const rows = props.items
    .filter((x) => (Number(x.value) || 0) > 0)
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
    .slice(0, maxItems);

  const max = Math.max(1, ...rows.map((r) => Number(r.value) || 0));

  if (!rows.length) {
    return <span className="text-sm text-black/40">{props.emptyText ?? "No data yet."}</span>;
  }

  return (
    <div className="mt-2 space-y-2">
      {rows.map((r) => {
        const pct = Math.max(0, Math.min(1, (Number(r.value) || 0) / max));
        return (
          <div key={r.label} className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <div className="truncate text-sm text-black/55">{r.label}</div>
                <div className="text-xs text-black/45 shrink-0">{r.right ?? String(r.value)}</div>
              </div>
              <div className="mt-1 h-2 rounded-full bg-black/5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-black/20 transition-all duration-500"
                  style={{ width: `${pct * 100}%` }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function GardenDashboardPanels(props: { metrics: GardenDashboardMetrics }) {
  const { metrics } = props;

  const plantingStatusChips = useMemo(() => {
    const order = ["planned", "active", "harvested", "failed", "archived"];
    return order
      .filter((k) => (metrics.plantingsByStatus[k] ?? 0) > 0)
      .map((k) => ({ k, v: metrics.plantingsByStatus[k] ?? 0 }));
  }, [metrics.plantingsByStatus]);

  const donutSegments = useMemo(() => {
    const order = ["active", "planned", "harvested", "failed", "archived"];
    return order.map((k) => ({ label: k, value: Number(metrics.plantingsByStatus[k] ?? 0) }));
  }, [metrics.plantingsByStatus]);

  const careBars = useMemo(() => {
    return Object.entries(metrics.careByType7d).map(([label, value]) => ({
      label,
      value: Number(value) || 0,
    }));
  }, [metrics.careByType7d]);

  const issueBars = useMemo(() => {
    return Object.entries(metrics.issuesByType14d).map(([label, value]) => ({
      label,
      value: Number(value) || 0,
    }));
  }, [metrics.issuesByType14d]);

  const harvestBars = useMemo(() => {
    return metrics.harvestTopItems7d.map((it) => ({
      label: it.name,
      value: Number(it.qty) || 0,
      right: `${it.qty} ${it.unit}`,
    }));
  }, [metrics.harvestTopItems7d]);

  return (
    <DashboardGrid cols={2}>
      {/* Plantings */}
      <DashboardPanel title="Plantings overview">
        {/* ✅ mobile-proof */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:flex-1">
            <KpiStat label="Total plantings" value={metrics.plantingsTotal} />
            <KpiStat label="Active" value={metrics.plantingsByStatus["active"] ?? 0} />
          </div>

          <div className="sm:shrink-0 flex justify-center sm:justify-end">
            <MiniDonut title="Plantings status distribution" segments={donutSegments} size={56} stroke={8} />
          </div>
        </div>

        {/* ✅ premium sparkline */}
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="text-xs text-black/45">Planted — last 7 days</div>
          <Sparkline values={metrics.plantingsTrend7d.counts} title="Plantings planted (7d)" fill />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Pill label="total" value={metrics.plantingsTotal} />
          {plantingStatusChips.map((x) => (
            <Pill key={x.k} label={x.k} value={x.v} />
          ))}
          {!plantingStatusChips.length ? <span className="text-sm text-black/40">No plantings yet.</span> : null}
        </div>
      </DashboardPanel>

      {/* Care */}
      <DashboardPanel title="Care — last 7 days">
        <div className="grid grid-cols-2 gap-2">
          <KpiStat label="Events" value={metrics.careCount7d} />
          <KpiStat label="Labor (min)" value={Math.round(metrics.laborMinutes7d)} />
          <KpiStat label="Water (L)" value={Math.round(metrics.waterLiters7d)} />
          <KpiStat label="Material cost" value={fmtMoneyPairs(metrics.materialCost7dByCurrency)} />
        </div>

        <div className="mt-3">
          <div className="text-xs font-medium text-black/55">Top types</div>
          <BarList items={careBars} maxItems={6} emptyText="No care logged." />
        </div>
      </DashboardPanel>

      {/* Issues */}
      <DashboardPanel title="Issues — last 14 days">
        <div className="grid grid-cols-2 gap-2">
          <KpiStat label="Issues" value={metrics.issuesCount14d} />
          <KpiStat
            label="Top type"
            value={issueBars.length ? issueBars.sort((a, b) => b.value - a.value)[0]?.label ?? "—" : "—"}
            hint={issueBars.length ? `${issueBars.sort((a, b) => b.value - a.value)[0]?.value ?? 0} events` : undefined}
          />
        </div>

        {/* ✅ premium heat strip */}
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="text-xs text-black/45">Last 14 days</div>
          <HeatStrip14 values={metrics.issuesHeat14.counts} title="Issue intensity (14d)" />
        </div>

        <div className="mt-3">
          <div className="text-xs font-medium text-black/55">By type</div>
          <BarList items={issueBars} maxItems={6} emptyText="No issues logged." />
        </div>
      </DashboardPanel>

      {/* Harvest */}
      <DashboardPanel title="Harvest — last 7 days">
        <div className="grid grid-cols-2 gap-2">
          <KpiStat label="Harvest events" value={metrics.harvestCount7d} />
          <KpiStat label="Top items" value={metrics.harvestTopItems7d.length} />
        </div>

        <div className="mt-3">
          <div className="text-xs font-medium text-black/55">Top items</div>
          <BarList items={harvestBars} maxItems={5} emptyText="No harvest logged." />
        </div>
      </DashboardPanel>
    </DashboardGrid>
  );
}
