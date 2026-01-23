"use client";

import { useMemo } from "react";

import GardenModule from "../../modules/garden/module";
import { useWorkspaceStore } from "../../editor-core/workspace/useWorkspaceStore";
import type { PortalContext } from "../../../lib/portal/getPortalContext";

import GardenSheets from "./GardenSheets";
import StudioShell from "../../editor-core/shell";

import AppShell, { type ShellNavItem } from "../../editor-core/shell/AppShell";

export type GardenView = "sheets" | "designer";

export default function GardenApp({
  onBack,
  portal,
  view,
  onViewChange,
}: {
  onBack: () => void;
  portal: PortalContext;
  view: GardenView;
  onViewChange: (v: GardenView) => void;
}) {
  const store = useWorkspaceStore(GardenModule, { tenantId: portal.tenantId });

  const navItems: ShellNavItem[] = useMemo(
    () => [
      { key: "designer", label: "Map", icon: "🗺️" },
      { key: "sheets", label: "Data", icon: "📋" },
    ],
    []
  );

  // Optional: show garden name in the dock hint area instead of taking canvas space
  const activeGarden = useMemo(
    () =>
      store.state.gardens.find((g: any) => g.id === store.state.activeGardenId) ?? null,
    [store.state]
  );

  return (
    <AppShell
      navItems={navItems}
      activeKey={view}
      onChange={(k) => onViewChange(k as GardenView)}
      onGoWorkplace={onBack}
      brandLabel="Roseiies"
      brandMarkSrc="/brand/eiie.svg"
      brandWordmarkSrc="/brand/roseiies.svg"
      workspaceName="Olivea"
      userName="Not signed in"
      onOpenSettings={() => console.log("settings")} 
      bottomHint={
        <>
          <div className="font-medium text-black/55 truncate">
            {activeGarden?.name ?? "Garden"}
          </div>
          <div className="text-black/40">Map + Data</div>
        </>
      }
      watermarkText="Powered by Roseiies"
      dockDefaultExpanded={false}
    >
      {/* IMPORTANT: no extra padding wrapper here */}
      <div className="h-full w-full overflow-hidden">
        {view === "sheets" ? (
          // Sheets should scroll internally, not the whole app
          <div className="h-full overflow-auto p-4">
            <GardenSheets store={store} portal={portal} onGoDesign={() => onViewChange("designer")} />
          </div>
        ) : (
          // StudioShell already manages full-height + internal overflow/scroll
          <StudioShell module={GardenModule} store={store} portal={portal} />
        )}
      </div>
    </AppShell>
  );
}
