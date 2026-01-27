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

/** Mobile-only: Map/Data tabs (icons only) for the Garden app */
function GardenMobileTabs(props: {
  view: GardenView;
  onViewChange: (v: GardenView) => void;
}) {
  const MapIcon = NAV_ICONS.map;
  const DataIcon = NAV_ICONS.data;

  function TabButton(args: {
    active: boolean;
    label: string;
    onClick: () => void;
    Icon: any;
  }) {
    const { active, label, onClick, Icon } = args;

    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        title={label}
        className={[
          "h-11 w-16 rounded-2xl inline-flex items-center justify-center",
          "transition active:scale-[0.98]",
          active ? "bg-black/6" : "bg-transparent hover:bg-black/3",
        ].join(" ")}
      >
        <Icon
          size={22}
          strokeWidth={1.8}
          className={active ? "text-black" : "text-black/55"}
        />
      </button>
    );
  }

  return (
    <div className="lg:hidden fixed inset-x-0 bottom-0 z-50">
      <div className="pb-[calc(env(safe-area-inset-bottom,0px)+10px)]">
        <div className="mx-auto w-fit">
          <div
            className={[
              "h-14 px-2 rounded-3xl",
              "border border-black/10 bg-white/85 backdrop-blur",
              "shadow-lg",
              "flex items-center gap-1",
            ].join(" ")}
          >
            <TabButton
              active={props.view === "designer"}
              label="Map"
              onClick={() => props.onViewChange("designer")}
              Icon={MapIcon}
            />
            <TabButton
              active={props.view === "sheets"}
              label="Data"
              onClick={() => props.onViewChange("sheets")}
              Icon={DataIcon}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

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

  // Desktop dock nav items (DockLeft) — unchanged
  const navItems: ShellNavItem[] = useMemo(
    () => [
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

        {/* mobile tabs even while loading */}
        <GardenMobileTabs view={view} onViewChange={onViewChange} />
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
      {/* ✅ reserve space for the Garden mobile tabs so nothing is covered */}
      <div className="relative h-full w-full overflow-hidden lg:pb-0 pb-[calc(env(safe-area-inset-bottom,0px)+76px)]">
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

      {/* ✅ mobile-only Map/Data icons */}
      <GardenMobileTabs view={view} onViewChange={onViewChange} />
    </AppShell>
  );
}
