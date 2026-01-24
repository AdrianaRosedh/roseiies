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
  // ✅ Guard portal early (prevents weird undefined tenant situations)
  if (!portal?.tenantId) {
    return (
      <div className="p-6 text-sm text-black/60">
        Missing portal.tenantId — GardenApp needs a tenant context.
      </div>
    );
  }

  const store = useWorkspaceStore(GardenModule, { tenantId: portal.tenantId });

  const navItems: ShellNavItem[] = useMemo(
    () => [
      { key: "designer", label: "Map", icon: "🗺️" },
      { key: "sheets", label: "Data", icon: "📋" },
    ],
    []
  );

  // ✅ If store is not ready yet, don’t touch store.state
  const activeGarden = useMemo(() => {
    if (!store?.state) return null;
    return store.state.gardens.find((g: any) => g.id === store.state.activeGardenId) ?? null;
  }, [store?.state]);

  // ✅ Render a light shell while store boots
  if (!store?.state) {
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
            <div className="font-medium text-black/55 truncate">Garden</div>
            <div className="text-black/40">Loading…</div>
          </>
        }
        watermarkText="Powered by Roseiies"
        dockDefaultExpanded={false}
      >
        <div className="h-full w-full grid place-items-center text-sm text-black/50">
          Loading workspace…
        </div>
      </AppShell>
    );
  }

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
      <div className="h-full w-full overflow-hidden">
        {view === "sheets" ? (
          <div className="h-full overflow-auto p-4">
            <GardenSheets store={store} portal={portal} onGoDesign={() => onViewChange("designer")} />
          </div>
        ) : (
          <StudioShell module={GardenModule} store={store} portal={portal} />
        )}
      </div>
    </AppShell>
  );
}