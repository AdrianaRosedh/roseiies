// apps/studio/app/studio/apps/garden/sheets/components/GardenSheetsToolbar.tsx
"use client";

import React from "react";

export default function GardenSheetsToolbar(props: {
  gardenName: string | null;
  loading: boolean;
  lastError: string | null;
  onRefresh: () => void;
  onAddColumn: () => void;
  onGoDesign?: () => void;
}) {
  const { gardenName, loading, lastError, onRefresh, onAddColumn, onGoDesign } = props;

  return (
    <div className="sticky top-0 z-20 border-b border-black/10 bg-white/70 backdrop-blur">
      <div className="px-4 py-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wide text-black/45">Garden Sheet</div>
          <div className="text-sm font-semibold text-black/80 truncate">
            {gardenName ?? "—"}
          </div>
          {lastError ? (
            <div className="mt-1 text-xs text-rose-700/80 truncate">
              {lastError}
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onGoDesign ? (
            <button
              onClick={onGoDesign}
              className="rounded-lg border border-black/10 bg-white/70 px-3 py-2 text-sm hover:bg-white"
            >
              Map
            </button>
          ) : null}

          <button
            onClick={onAddColumn}
            className="rounded-lg border border-black/10 bg-white/70 px-3 py-2 text-sm hover:bg-white"
            title="Add a column"
          >
            + Column
          </button>

          <button
            onClick={onRefresh}
            className="rounded-lg border border-black/10 bg-white/70 px-3 py-2 text-sm hover:bg-white"
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>
    </div>
  );
}