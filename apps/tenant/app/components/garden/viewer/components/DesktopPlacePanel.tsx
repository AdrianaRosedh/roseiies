"use client";

import type { GardenPlanting } from "@/lib/garden/load-plantings";
import type { Role } from "../types";
import PlantCardsRow from "./PlantCardsRow";

export default function DesktopPlacePanel(props: {
  open: boolean;
  bedLabel: string | null;
  role: Role;
  plantings: GardenPlanting[];
  selectedPlantingId: string | null;
  onSelectPlanting: (id: string) => void;
}) {
  if (!props.open) return null;

  return (
    // ✅ FIXED overlay — never pushes the canvas
    <div className="fixed left-4 top-24 z-70 w-95 pointer-events-auto">
      <div className="rounded-2xl border border-(--rose-border) bg-(--rose-surface)/92 backdrop-blur shadow-sm overflow-hidden">
        <div className="p-4">
          {!props.bedLabel ? (
            <div className="text-sm text-(--rose-muted)">
              Search or click a bed (or a pin) to see what’s growing.
            </div>
          ) : (
            <>
              <div className="text-xs text-(--rose-muted)">Bed</div>
              <div className="mt-1 text-lg font-semibold text-(--rose-ink)">
                {props.bedLabel}
              </div>

              {props.plantings.length === 0 ? (
                <div className="mt-3 text-sm text-(--rose-muted)">
                  No plantings for this bed (or no matches).
                </div>
              ) : (
                <>
                  <div className="mt-2 text-xs text-(--rose-muted)">
                    Plantings: {props.plantings.length}
                  </div>
                  <PlantCardsRow
                    plantings={props.plantings}
                    role={props.role}
                    selectedPlantingId={props.selectedPlantingId}
                    onSelectPlanting={props.onSelectPlanting}
                  />
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
