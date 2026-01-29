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
  if (!props.plantings.length) {
    return <div style={{ fontSize: 12, color: "var(--muted)" }}>No plantings.</div>;
  }

  return (
    <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 6 }}>
      {props.plantings.map((p) => {
        const active = p.id === props.selectedPlantingId;
        return (
          <button
            key={p.id}
            onClick={() => props.onSelectPlanting(p.id)}
            style={{
              minWidth: 220,
              maxWidth: 260,
              textAlign: "left",
              border: "1px solid var(--border)",
              background: active ? "rgba(96,165,250,0.12)" : "rgba(255,255,255,0.04)",
              color: "var(--fg)",
              borderRadius: 18,
              padding: 12,
              cursor: "pointer",
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 650 }}>
              {p.crop ?? "Unknown crop"}
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
              {p.status ?? "—"}
            </div>
            {p.guest_story ? (
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>
                {p.guest_story}
              </div>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
