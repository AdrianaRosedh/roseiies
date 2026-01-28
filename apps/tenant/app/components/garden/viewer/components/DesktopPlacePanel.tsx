// apps/tenant/app/components/garden/viewer/components/DesktopPlacePanel.tsx
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
    // ✅ wrapper doesn't block map dragging outside the card
    <div className="fixed left-4 top-24 z-70 pointer-events-none">
      <div
        className="pointer-events-auto rounded-2xl border backdrop-blur shadow-sm overflow-hidden"
        style={{
          width: 360,
          maxHeight: "calc(100dvh - 7rem)",
          borderColor: "var(--rose-border)",
          backgroundColor: "color-mix(in srgb, var(--rose-surface) 82%, transparent)",
        }}
      >
        <div className="p-4">
          {!props.bedLabel ? (
            <div className="text-sm" style={{ color: "var(--rose-muted)" }}>
              Search or click a bed (or a pin) to see what’s growing.
            </div>
          ) : props.plantings.length === 0 ? (
            <>
              <div className="text-xs" style={{ color: "var(--rose-muted)" }}>
                Bed
              </div>
              <div className="mt-1 text-lg font-semibold" style={{ color: "var(--rose-ink)" }}>
                {props.bedLabel}
              </div>
              <div className="mt-3 text-sm" style={{ color: "var(--rose-muted)" }}>
                No plantings for this bed (or no matches).
              </div>
            </>
          ) : (
            <>
              <div className="text-xs" style={{ color: "var(--rose-muted)" }}>
                Bed
              </div>
              <div className="mt-1 text-lg font-semibold" style={{ color: "var(--rose-ink)" }}>
                {props.bedLabel}
              </div>

              <div className="mt-2 text-xs" style={{ color: "var(--rose-muted)" }}>
                Plantings: {props.plantings.length}
              </div>

              <div className="mt-2 overflow-y-auto" style={{ maxHeight: "calc(100dvh - 14rem)" }}>
                <PlantCardsRow
                  plantings={props.plantings}
                  role={props.role}
                  selectedPlantingId={props.selectedPlantingId}
                  onSelectPlanting={props.onSelectPlanting}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
