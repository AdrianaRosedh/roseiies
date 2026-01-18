"use client";

import { useMemo, useState } from "react";
import { Stage, Layer, Rect, Text, Group, Circle } from "react-konva";
import type { GardenPlanting } from "@/lib/garden/load-plantings";

type Item = {
  id: string;
  type: string;
  x: number;
  y: number;
  w: number;
  h: number;
  r: number;
  order: number;
  label: string;
  meta: any;
  style: any;
};

type Role = "guest" | "gardener" | "kitchen";

function rgba(hex: string, opacity: number) {
  const h = String(hex ?? "#010506").replace("#", "").trim();
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}

function roleCard(p: GardenPlanting, role: Role) {
  if (role === "guest") {
    return {
      title: p.crop,
      subtitle: p.status ?? "growing",
      body: p.guest_story ?? "",
    };
  }
  if (role === "gardener") {
    return {
      title: p.crop,
      subtitle: p.planted_at ? `planted: ${p.planted_at}` : "ops",
      body: p.gardener_notes ?? "",
    };
  }
  return {
    title: p.crop,
    subtitle: p.status ?? "kitchen",
    body: p.kitchen_notes ?? "",
  };
}

export default function GardenViewer({
  canvas,
  items,
  plantings,
  role = "guest",
}: {
  canvas: { width: number; height: number };
  items: Item[];
  plantings: GardenPlanting[];
  role?: Role;
}) {
  const [selectedBedId, setSelectedBedId] = useState<string | null>(null);
  const [selectedPlantingId, setSelectedPlantingId] = useState<string | null>(null);

  const beds = useMemo(() => items.filter((i) => i.type === "bed"), [items]);

  const plantingsByBed = useMemo(() => {
    const m = new Map<string, GardenPlanting[]>();
    for (const p of plantings) {
      const arr = m.get(p.bed_id) ?? [];
      arr.push(p);
      m.set(p.bed_id, arr);
    }
    return m;
  }, [plantings]);

  const selectedBed = useMemo(
    () => (selectedBedId ? beds.find((b) => b.id === selectedBedId) ?? null : null),
    [beds, selectedBedId]
  );

  const selectedPlanting = useMemo(() => {
    if (selectedPlantingId) return plantings.find((p) => p.id === selectedPlantingId) ?? null;
    if (selectedBedId) {
      const list = plantingsByBed.get(selectedBedId) ?? [];
      return list[0] ?? null;
    }
    return null;
  }, [plantings, plantingsByBed, selectedBedId, selectedPlantingId]);

  // Roseiies accents
  const ROSE_BLUE = "#10bbbf";

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_340px]">
      {/* Canvas panel */}
      <div className="w-full overflow-hidden rounded-2xl border border-(--rose-border) bg-(--rose-surface) backdrop-blur shadow-sm">
        <Stage width={900} height={560}>
          <Layer>
            {/* Light stage background (NOT dark) */}
            <Rect x={0} y={0} width={900} height={560} fill="rgba(255,255,255,0.22)" />

            <Group x={24} y={24}>
              {/* Canvas boundary */}
              <Rect
                x={0}
                y={0}
                width={canvas.width}
                height={canvas.height}
                fill="rgba(255,255,255,0.16)"
                stroke="rgba(1,5,6,0.10)"
                strokeWidth={2}
                cornerRadius={18}
              />

              {items.map((it) => {
                const s = it.style ?? {};
                const fill = rgba(s.fill ?? "#e9e2d6", s.fillOpacity ?? 0.86);
                const stroke = rgba(s.stroke ?? "#010506", s.strokeOpacity ?? 0.10);
                const radius = s.radius ?? 16;
                const strokeWidth = s.strokeWidth ?? 1.2;

                const isBed = it.type === "bed";
                const isSelected = isBed && it.id === selectedBedId;

                return (
                  <Group
                    key={it.id}
                    x={it.x}
                    y={it.y}
                    rotation={it.r}
                    onClick={() => {
                      if (!isBed) return;
                      setSelectedPlantingId(null);
                      setSelectedBedId(it.id);
                    }}
                  >
                    <Rect
                      width={it.w}
                      height={it.h}
                      fill={fill}
                      stroke={isSelected ? ROSE_BLUE : stroke}
                      strokeWidth={isSelected ? 2.4 : strokeWidth}
                      cornerRadius={radius}
                    />

                    <Text
                      x={12}
                      y={10}
                      text={it.label}
                      fontSize={14}
                      fill="rgba(1,5,6,0.62)"
                      listening={false}
                    />

                    {/* Pins for this bed */}
                    {isBed &&
                      (plantingsByBed.get(it.id) ?? [])
                        .filter((p) => p.pin_x != null && p.pin_y != null)
                        .map((p) => (
                          <Circle
                            key={p.id}
                            x={(p.pin_x as number) * it.w}
                            y={(p.pin_y as number) * it.h}
                            radius={6}
                            fill={ROSE_BLUE}
                            stroke="rgba(1,5,6,0.18)"
                            strokeWidth={1}
                            onClick={(e) => {
                              e.cancelBubble = true;
                              setSelectedBedId(it.id);
                              setSelectedPlantingId(p.id);
                            }}
                          />
                        ))}
                  </Group>
                );
              })}
            </Group>
          </Layer>
        </Stage>
      </div>

      {/* Info panel */}
      <aside className="rounded-2xl border border-(--rose-border) bg-(--rose-surface) backdrop-blur shadow-sm p-5">
        {!selectedBed ? (
          <div className="text-sm text-(--rose-muted)">
            Click a bed (or a pin) to see what’s growing.
          </div>
        ) : (
          <>
            <div className="text-xs text-(--rose-muted)">Bed</div>
            <div className="mt-1 text-lg font-semibold text-(--rose-ink)">
              {selectedBed.label}
            </div>

            <div className="mt-4 border-t border-(--rose-border) pt-4">
              {!selectedPlanting ? (
                <div className="text-sm text-(--rose-muted)">
                  No plantings for this bed yet.
                </div>
              ) : (
                (() => {
                  const card = roleCard(selectedPlanting, role);
                  return (
                    <div className="space-y-2">
                      <div className="text-xs text-(--rose-muted)">{card.subtitle}</div>
                      <div className="text-xl font-semibold text-(--rose-ink)">{card.title}</div>
                      {card.body ? (
                        <p className="text-sm leading-relaxed text-(--rose-ink) opacity-80">
                          {card.body}
                        </p>
                      ) : (
                        <p className="text-sm text-(--rose-muted)">
                          (No notes yet for this role.)
                        </p>
                      )}
                    </div>
                  );
                })()
              )}
            </div>

            <div className="mt-5 text-xs text-(--rose-muted)">
              Plantings in this bed: {(plantingsByBed.get(selectedBed.id) ?? []).length}
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
