"use client";

import { useState } from "react";
import GardenModule from "../../modules/garden/module";
import { useWorkspaceStore } from "../../editor-core/useWorkspaceStore";
import type { PortalContext } from "../../../lib/portal/getPortalContext";
import GardenSheets from "./GardenSheets";
import StudioShellInner from "../../editor-core/StudioShellInner";

type Tab = "sheets" | "designer";

export default function GardenApp({
  onBack,
  portal,
}: {
  onBack: () => void;
  portal: PortalContext;
}) {
  const store = useWorkspaceStore(GardenModule);
  const [tab, setTab] = useState<Tab>("sheets");

  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-4 mb-4">
        <button
          onClick={onBack}
          className="rounded-lg border border-black/10 bg-white/60 px-3 py-2 text-sm backdrop-blur hover:bg-white/80"
        >
          ← Workplace
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setTab("sheets")}
            className={`rounded-lg px-3 py-2 text-sm border ${
              tab === "sheets"
                ? "border-black/20 bg-black/5"
                : "border-black/10 bg-white/60 backdrop-blur"
            }`}
          >
            Sheets
          </button>
          <button
            onClick={() => setTab("designer")}
            className={`rounded-lg px-3 py-2 text-sm border ${
              tab === "designer"
                ? "border-black/20 bg-black/5"
                : "border-black/10 bg-white/60 backdrop-blur"
            }`}
          >
            Designer
          </button>
        </div>
      </div>

      {tab === "sheets" ? (
        <GardenSheets store={store} portal={portal} />
      ) : (
        <StudioShellInner module={GardenModule} store={store} portal={portal} />
      )}
    </div>
  );
}
