// apps/studio/app/studio/apps/garden/GardenApp.tsx
"use client";

import { useEffect, useMemo } from "react";

import GardenModule from "../../modules/garden/module";
import { useWorkspaceStore } from "../../editor-core/workspace/useWorkspaceStore";
import type { PortalContext } from "../../../lib/portal/getPortalContext";

import GardenSheets from "./GardenSheets";
import StudioShell from "../../editor-core/shell";

import AppShell, { type ShellNavItem } from "../../editor-core/shell/AppShell";
import { NAV_ICONS } from "../../editor-core/shell/navIcons";

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
      { key: "designer", label: "Map", icon: NAV_ICONS.map },
      { key: "sheets", label: "Data", icon: NAV_ICONS.data },
    ],
    []
  );

  const activeGarden = useMemo(() => {
    if (!store?.state) return null;
    return store.state.gardens.find((g: any) => g.id === store.state.activeGardenId) ?? null;
  }, [store?.state]);

  // Clear selection when layout changes (safe)
  useEffect(() => {
    if (!store?.state?.activeLayoutId) return;
    store.setSelectedIds([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store?.state?.activeLayoutId]);

  // Clear selection once when entering designer view
  useEffect(() => {
    if (view !== "designer") return;
    store.setSelectedIds([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

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

  const showSheets = view === "sheets";
  const showDesigner = view === "designer";

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
      {/* IMPORTANT:
          Keep BOTH mounted so Map doesn't "reload" on tab switch.
          We swap visibility with opacity + pointer-events, not conditional rendering. */}
      <div className="relative h-full w-full overflow-hidden">
        {/* Sheets */}
        <div
          className={[
            "absolute inset-0",
            "transition-opacity duration-200",
            showSheets ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
          ].join(" ")}
          aria-hidden={!showSheets}
        >
          <div className="h-full overflow-auto p-4">
            <GardenSheets
              store={store}
              portal={portal}
              onGoDesign={() => onViewChange("designer")}
            />
          </div>
        </div>

        {/* Designer */}
        <div
          className={[
            "absolute inset-0",
            "transition-opacity duration-200",
            showDesigner ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
          ].join(" ")}
          aria-hidden={!showDesigner}
        >
          <StudioShell module={GardenModule} store={store} portal={portal} />
        </div>
      </div>
    </AppShell>
  );
}
