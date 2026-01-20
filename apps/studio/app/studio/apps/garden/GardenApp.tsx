"use client";

import GardenModule from "../../modules/garden/module";
import { useWorkspaceStore } from "../../editor-core/useWorkspaceStore";
import type { PortalContext } from "../../../lib/portal/getPortalContext";
import GardenSheets from "./GardenSheets";
import StudioShellInner from "../../editor-core/StudioShellInner";

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

  return (
    <div className="w-full">
      {/* Airtable-like page header row: one back button + optional actions */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <button
          onClick={onBack}
          className="rounded-lg border border-black/10 bg-white/70 px-3 py-2 text-sm shadow-sm hover:bg-white"
        >
          ← Workplace
        </button>

        {/* Optional: future “share / export / publish history” lives here */}
        <div className="flex items-center gap-2">
          {view === "sheets" ? (
            <button
              onClick={() => onViewChange("designer")}
              className="rounded-lg border border-black/10 bg-white/70 px-3 py-2 text-sm shadow-sm hover:bg-white"
            >
              Open Designer →
            </button>
          ) : null}
        </div>
      </div>

      {view === "sheets" ? (
        <GardenSheets store={store} portal={portal} onGoDesign={() => onViewChange("designer")} />
      ) : (
        <StudioShellInner module={GardenModule} store={store} portal={portal} />
      )}
    </div>
  );
}

/**
 * ✅ Airtable-style tabs for StudioChrome.centerSlot
 */
export function GardenViewTabs({
  value,
  onChange,
}: {
  value: GardenView;
  onChange: (v: GardenView) => void;
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-xl border border-black/10 bg-white/60 px-1 py-1 shadow-sm backdrop-blur">
      <TabButton active={value === "designer"} onClick={() => onChange("designer")}>
        Designer
      </TabButton>
      <TabButton active={value === "sheets"} onClick={() => onChange("sheets")}>
        Sheets
      </TabButton>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "rounded-lg px-3 py-1.5 text-xs transition",
        active
          ? "bg-white text-black shadow-sm border border-black/10"
          : "text-black/65 hover:bg-white/60",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
