// apps/studio/app/studio/apps/garden/GardenApp.tsx
"use client";

import { useEffect, useMemo } from "react";
import { LayoutDashboard } from "lucide-react";

import GardenModule from "../../modules/garden/module";
import { useWorkspaceStore } from "../../editor-core/workspace/useWorkspaceStore";
import type { PortalContext } from "../../../lib/portal/getPortalContext";

import AppShell, { type ShellNavItem } from "../../editor-core/shell/AppShell";
import { NAV_ICONS } from "../../editor-core/shell/navIcons";

import GardenDashboard from "./dashboard/GardenDashboard";
import GardenSheets from "./GardenSheets";
import StudioShell from "../../editor-core/shell";

import GardenMobileViewDock from "./components/GardenMobileViewDock";

export type GardenView = "dashboard" | "designer" | "sheets";

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

  // DockLeft nav items (desktop)
  const navItems: ShellNavItem[] = useMemo(
    () => [
      { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { key: "designer", label: "Map", icon: NAV_ICONS.map },
      { key: "sheets", label: "Data", icon: NAV_ICONS.data },
    ],
    []
  );

  const activeGarden = useMemo(() => {
    if (!store?.state) return null;
    return (
      store.state.gardens.find((g: any) => g.id === store.state.activeGardenId) ??
      null
    );
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

  // Reserve space for the mobile view dock so content isn’t covered
  const mobileDockPad =
    "pb-[calc(env(safe-area-inset-bottom,0px)+86px)]"; // matches GardenMobileViewDock height + padding

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
        <div className={`relative h-full w-full overflow-hidden ${mobileDockPad} lg:pb-0`}>
          <div className="h-full w-full grid place-items-center text-sm text-black/50">
            Loading workspace…
          </div>
        </div>

        {/* ✅ mobile-only view dock (Dashboard / Map / Sheets) */}
        <GardenMobileViewDock view={view} onViewChange={onViewChange} />
      </AppShell>
    );
  }

  const showDashboard = view === "dashboard";
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
          <div className="text-black/40">Dashboard · Map · Data</div>
        </>
      }
      watermarkText="Powered by Roseiies"
      dockDefaultExpanded={false}
    >
      <div className={`relative h-full w-full overflow-hidden ${mobileDockPad} lg:pb-0`}>
        {/* Dashboard */}
        <div
          className={[
            "absolute inset-0",
            "transition-opacity duration-200",
            showDashboard
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none",
          ].join(" ")}
          aria-hidden={!showDashboard}
        >
          <GardenDashboard
            store={store}
            portal={portal}
            onGoDesigner={() => onViewChange("designer")}
            onGoSheets={() => onViewChange("sheets")}
            onBack={onBack}
          />
        </div>

        {/* Sheets */}
        <div
          className={[
            "absolute inset-0",
            "transition-opacity duration-200",
            showSheets
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none",
          ].join(" ")}
          aria-hidden={!showSheets}
        >
          <div className="h-full w-full overflow-hidden">
            <GardenSheets
              store={store}
              portal={portal}
              onGoDesign={() => onViewChange("designer")}
              onBack={onBack}
            />
          </div>
        </div>

        {/* Designer */}
        <div
          className={[
            "absolute inset-0",
            "transition-opacity duration-200",
            showDesigner
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none",
          ].join(" ")}
          aria-hidden={!showDesigner}
        >
          <StudioShell module={GardenModule} store={store} portal={portal} onBack={onBack} />
        </div>
      </div>

      {/* ✅ mobile-only view dock (Dashboard / Map / Sheets) */}
      <GardenMobileViewDock view={view} onViewChange={onViewChange} />
    </AppShell>
  );
}
