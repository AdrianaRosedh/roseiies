// apps/studio/app/studio/apps/garden/dashboard/GardenDashboard.tsx
"use client";

import { useMemo } from "react";

import GardenAppHeader from "../components/GardenAppHeader";
import DashboardView from "@/app/studio/editor-core/dashboard/DashboardView";
import GardenDashboardPanels from "./GardenDashboardPanels";

import AppSectionToolbar from "@/app/studio/editor-core/shell/components/AppSectionToolbar";
import { useStableLoading } from "@/app/studio/editor-core/shell/hooks/useStableLoading";

import { useGardenContext } from "../hooks/useGardenContext";
import { useGardenDashboardMetrics } from "./hooks/useGardenDashboardMetrics";

function LivePill(props: { state: "connecting" | "live" | "offline" }) {
  const { state } = props;

  const label = state === "live" ? "Live" : state === "connecting" ? "Connecting" : "Offline";
  const dotClass =
    state === "live"
      ? "bg-emerald-500 animate-pulse"
      : state === "connecting"
        ? "bg-amber-500"
        : "bg-black/35";

  const textClass =
    state === "live"
      ? "text-emerald-700/80"
      : state === "connecting"
        ? "text-amber-700/80"
        : "text-black/50";

  return (
    <span
      className={[
        "inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-2 text-xs shadow-sm",
        "transition-all duration-300",
        textClass,
      ].join(" ")}
      title="Realtime status"
    >
      <span className={["h-2 w-2 rounded-full", dotClass].join(" ")} />
      {label}
    </span>
  );
}

export default function GardenDashboard(props: {
  store: any;
  portal: any;
  onGoDesigner: () => void;
  onGoSheets: () => void;
  onBack?: () => void;
}) {
  const tenantId = String(props.portal?.tenantId ?? "");

  const displayGardenName = useMemo(() => {
    const s = props.store?.state;
    if (!s) return "Garden";
    const g = s.gardens?.find((x: any) => x.id === s.activeGardenId) ?? null;
    return g?.name ?? "Garden";
  }, [props.store?.state]);

  const dbAreaName = "Garden";
  const { areaName, getCtx } = useGardenContext({ areaName: dbAreaName });

  const { metrics, loading, error, liveState } = useGardenDashboardMetrics({
    tenantId,
    areaName,
    getCtx,
  });

  const stableLoading = useStableLoading(loading);

  return (
    <div className="w-full h-full overflow-hidden flex flex-col">
      <GardenAppHeader
        sectionLabel={null}
        viewLabel="Dashboard"
        onGoWorkplace={props.onBack}
        subLeft={
          <div className="flex items-center gap-2 text-xs text-black/45">
            <span>Garden</span>
            <span className="text-black/25">•</span>
            <span className="truncate">{displayGardenName}</span>
          </div>
        }
        subRight={
          <AppSectionToolbar
            actions={[
              { kind: "button", label: "Map", onClick: props.onGoDesigner, tone: "ghost" },
              { kind: "button", label: "Sheets", onClick: props.onGoSheets, tone: "ghost" },
              { kind: "separator" },

              // If your toolbar supports nodes:
              { kind: "node", node: <LivePill state={liveState} /> },

              ...(stableLoading ? [{ kind: "text", value: "Updating…", tone: "muted" } as const] : []),
              ...(error ? [{ kind: "text", value: error, tone: "danger" } as const] : []),
            ]}
          />
        }
      />

      <div className="flex-1 min-h-0 overflow-hidden">
        <DashboardView>
          <GardenDashboardPanels metrics={metrics} />
        </DashboardView>
      </div>
    </div>
  );
}
