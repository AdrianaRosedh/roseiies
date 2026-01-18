"use client";

import { useMemo, useState } from "react";
import GardenModule from "../../modules/garden/module";
import { useWorkspaceStore } from "../../editor-core/useWorkspaceStore";
import StudioShellInner from "../../editor-core/StudioShellInner";
import GardenSheets from "./GardenSheets";

type Tab = "sheets" | "designer";

export default function GardenApp({ onBack }: { onBack: () => void }) {
  const store = useWorkspaceStore(GardenModule);
  const [tab, setTab] = useState<Tab>("sheets");

  const activeGarden = useMemo(
    () => store.state.gardens.find((g) => g.id === store.state.activeGardenId) ?? null,
    [store.state]
  );

  const activeLayout = useMemo(
    () => store.state.layouts.find((l) => l.id === store.state.activeLayoutId) ?? null,
    [store.state]
  );

  return (
    <div className="h-screen bg-[#fbfbfb] text-black">
      {/* App header */}
      <div className="h-14 border-b border-black/10 px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="rounded-lg border border-black/10 bg-white px-3 py-1.5 text-sm"
          >
            ← Workplace
          </button>

          <div>
            <div className="text-sm font-semibold leading-tight">Garden App</div>
            <div className="text-[11px] opacity-60 leading-tight">
              {activeGarden?.name ?? "No garden"} · {activeLayout?.name ?? "No layout"}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTab("sheets")}
            className={`rounded-lg px-3 py-1.5 text-sm border ${
              tab === "sheets" ? "border-black/20 bg-black/5" : "border-black/10 bg-white"
            }`}
          >
            Sheets
          </button>
          <button
            onClick={() => setTab("designer")}
            className={`rounded-lg px-3 py-1.5 text-sm border ${
              tab === "designer" ? "border-black/20 bg-black/5" : "border-black/10 bg-white"
            }`}
          >
            Designer
          </button>
        </div>
      </div>

      {/* Content */}
      {tab === "sheets" ? (
        <GardenSheets store={store} />
      ) : (
        <StudioShellInner module={GardenModule} store={store} />
      )}
    </div>
  );
}
