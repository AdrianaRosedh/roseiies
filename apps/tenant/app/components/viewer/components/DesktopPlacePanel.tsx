"use client";

import React from "react";

type Planting = {
  id: string;
  crop?: string | null;
  status?: string | null;
  guest_story?: string | null;
  gardener_notes?: string | null;
  kitchen_notes?: string | null;
};

export default function DesktopPlacePanel(props: {
  open: boolean;
  bedLabel: string | null;
  plantings: Planting[];
  selectedPlantingId: string | null;
  onSelectPlanting: (id: string) => void;
}) {
  if (!props.open) return null;

  return (
    <aside
      style={{
        position: "absolute",
        right: 16,
        top: 84,
        bottom: 16,
        width: 360,
        zIndex: 80,
        borderRadius: 22,
        border: "1px solid var(--border)",
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(14px)",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: 14 }}>
        <div style={{ fontSize: 12, color: "var(--muted)" }}>Selected bed</div>
        <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4 }}>
          {props.bedLabel ?? "—"}
        </div>
      </div>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      <div style={{ padding: 14, overflowY: "auto", height: "calc(100% - 78px)" }}>
        {props.plantings.length === 0 ? (
          <div style={{ fontSize: 12, color: "var(--muted)" }}>No plantings for this bed.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {props.plantings.map((p) => {
              const active = p.id === props.selectedPlantingId;
              return (
                <button
                  key={p.id}
                  onClick={() => props.onSelectPlanting(p.id)}
                  style={{
                    textAlign: "left",
                    border: "1px solid var(--border)",
                    background: active ? "rgba(96,165,250,0.12)" : "rgba(255,255,255,0.04)",
                    color: "var(--fg)",
                    borderRadius: 18,
                    padding: 12,
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 650 }}>{p.crop ?? "Unknown crop"}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>
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
        )}
      </div>
    </aside>
  );
}
