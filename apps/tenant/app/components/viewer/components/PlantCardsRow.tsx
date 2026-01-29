"use client";

import React from "react";

type Planting = {
  id: string;
  crop?: string | null;
  status?: string | null;
  guest_story?: string | null;
};

export default function PlantCardsRow(props: {
  plantings: Planting[];
  selectedPlantingId: string | null;
  onSelectPlanting: (id: string) => void;
}) {
  const BORDER = "rgba(15, 23, 42, 0.12)";
  const INK = "rgba(15,23,42,0.92)";
  const MUTED = "rgba(15,23,42,0.58)";
  const ACCENT = "rgba(251,113,133,0.18)";

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {props.plantings.map((p) => {
        const active = p.id === props.selectedPlantingId;

        return (
          <button
            key={p.id}
            type="button"
            onClick={() => props.onSelectPlanting(p.id)}
            style={{
              textAlign: "left",
              border: `1px solid ${BORDER}`,
              background: active ? ACCENT : "rgba(255,255,255,0.70)",
              color: INK,
              borderRadius: 18,
              padding: 14,
              cursor: "pointer",
              boxShadow: "0 10px 24px rgba(0,0,0,0.06)",
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 900 }}>
              {p.crop ?? "Unknown"}
            </div>

            <div style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>
              {p.status ?? "—"}
            </div>
          </button>
        );
      })}
    </div>
  );
}
