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
      {view === "sheets" ? (
        <GardenSheets
          store={store}
          portal={portal}
          onGoDesign={() => onViewChange("designer")}
        />
      ) : (
        <StudioShellInner
          module={GardenModule}
          store={store}
          portal={portal}
          onBack={onBack}
        />
      )}
    </div>
  );
}
