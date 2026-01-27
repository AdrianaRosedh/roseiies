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

export default function GardenDashboard(props: {
  store: any;
  portal: any;
  onGoDesigner: () => void;
  onGoSheets: () => void;
  onBack?: () => void;
}) {
  const tenantId = String(props.portal?.tenantId ?? "");

  // UI label (what the user calls this garden)
  const displayGardenName = useMemo(() => {
    const s = props.store?.state;
    if (!s) return "Garden";
    const g = s.gardens?.find((x: any) => x.id === s.activeGardenId) ?? null;
    return g?.name ?? "Garden";
  }, [props.store?.state]);

  // ✅ DB area name (what exists in roseiies.areas.name)
  // Sheets already uses "Garden" as the areaName; keep Dashboard consistent.
  const dbAreaName = "Garden";

  // ✅ IMPORTANT: fetch context using DB areaName, not the UI display name
  const { areaName, getCtx } = useGardenContext({ areaName: dbAreaName });

  const { loading, error, refresh } = useGardenDashboardMetrics({
    tenantId,
    areaName, // will be "Garden"
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

              ...(stableLoading
                ? [{ kind: "text", value: "Updating…", tone: "muted" } as const]
                : []),

              {
                kind: "button",
                label: "Refresh",
                onClick: refresh,
                tone: "primary",
                disabled: loading,
                title: "Refresh dashboard metrics",
              },

              ...(error ? [{ kind: "text", value: error, tone: "danger" } as const] : []),
            ]}
          />
        }
      />

      <div className="flex-1 min-h-0 overflow-hidden">
        <DashboardView>
          {/* ✅ Panels should also query using DB area name */}
          <GardenDashboardPanels tenantId={tenantId} areaName={dbAreaName} />
        </DashboardView>
      </div>
    </div>
  );
}
