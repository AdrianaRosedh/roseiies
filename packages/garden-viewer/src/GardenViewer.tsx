"use client";

import { useEffect, useMemo, useState } from "react";
import { Stage, Layer, Rect, Text, Group, Circle, Image as KonvaImage } from "react-konva";
import type { GardenViewerItem, GardenViewerPlanting, GardenViewerRole } from "./types";
import { useElementSize } from "./useElementSize";
import { colorWithOpacity } from "./style";
import { plantingWorldPoint } from "./plantings";
import { useTreeImage } from "./useTreeImage";

function roleCard(p: GardenViewerPlanting, role: GardenViewerRole) {
  if (role === "guest") return { title: p.crop, subtitle: p.status ?? "growing", body: p.guest_story ?? "" };
  if (role === "gardener") return { title: p.crop, subtitle: p.planted_at ? `planted: ${p.planted_at}` : "ops", body: p.gardener_notes ?? "" };
  return { title: p.crop, subtitle: p.status ?? "kitchen", body: p.kitchen_notes ?? "" };
}

function treeVariantFromMeta(meta: any) {
  return meta?.treeVariant ?? meta?.variant ?? meta?.tree ?? meta?.kind ?? "tree-01";
}

export default function GardenViewer(props: {
  canvas: { width: number; height: number };
  items: GardenViewerItem[];
  plantings: GardenViewerPlanting[];
  role?: GardenViewerRole;

  // where tree svgs live in the app
  treeBasePath?: string; // default "/images/trees"
}) {
  const { ref, size } = useElementSize();

  const role = props.role ?? "guest";
  const treeBasePath = props.treeBasePath ?? "/images/trees";
  const canvas = props.canvas;

  const [selectedBedId, setSelectedBedId] = useState<string | null>(null);
  const [selectedPlantingId, setSelectedPlantingId] = useState<string | null>(null);

  const beds = useMemo(() => props.items.filter((i) => i.type === "bed"), [props.items]);
  const trees = useMemo(() => props.items.filter((i) => i.type === "tree"), [props.items]);
  const labels = useMemo(() => props.items.filter((i) => i.type === "label"), [props.items]);

  useEffect(() => {
    if (!selectedBedId && beds.length) setSelectedBedId(beds[0].id);
  }, [beds, selectedBedId]);

  const bedById = useMemo(() => {
    const m = new Map<string, GardenViewerItem>();
    for (const b of beds) m.set(b.id, b);
    return m;
  }, [beds]);

  const plantingsByBed = useMemo(() => {
    const m = new Map<string, GardenViewerPlanting[]>();
    for (const p of props.plantings) {
      const arr = m.get(p.bed_id) ?? [];
      arr.push(p);
      m.set(p.bed_id, arr);
    }
    return m;
  }, [props.plantings]);

  const selectedBed = useMemo(
    () => (selectedBedId ? beds.find((b) => b.id === selectedBedId) ?? null : null),
    [beds, selectedBedId]
  );

  const selectedPlanting = useMemo(() => {
    if (selectedPlantingId) return props.plantings.find((p) => p.id === selectedPlantingId) ?? null;
    if (selectedBedId) return (plantingsByBed.get(selectedBedId) ?? [])[0] ?? null;
    return null;
  }, [props.plantings, plantingsByBed, selectedBedId, selectedPlantingId]);

  const PAD = 24;
  const innerW = Math.max(1, size.w - PAD * 2);
  const innerH = Math.max(1, size.h - PAD * 2);

  const scale = Math.min(innerW / canvas.width, innerH / canvas.height);
  const offsetX = PAD + (innerW - canvas.width * scale) / 2;
  const offsetY = PAD + (innerH - canvas.height * scale) / 2;

  const ROSE_BLUE = "#10bbbf";

  // cache one image per variant (simple v1: first tree decides src)
  const firstVariant = trees[0] ? treeVariantFromMeta(trees[0].meta) : null;
  const treeImg = useTreeImage(firstVariant ? `${treeBasePath}/${firstVariant}.svg` : null);

  const plantingDots = useMemo(() => {
    const out: Array<{ p: GardenViewerPlanting; x: number; y: number; bedId: string }> = [];
    for (const p of props.plantings) {
      const bed = bedById.get(p.bed_id);
      if (!bed) continue;
      const pt = plantingWorldPoint(p, bed);
      out.push({ p, x: pt.x, y: pt.y, bedId: bed.id });
    }
    return out;
  }, [props.plantings, bedById]);

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_340px]">
      <div className="w-full overflow-hidden rounded-2xl border border-(--rose-border) bg-(--rose-surface) backdrop-blur shadow-sm">
        <div ref={ref} className="w-full h-[560px]">
          <Stage width={size.w} height={size.h}>
            <Layer>
              <Rect x={0} y={0} width={size.w} height={size.h} fill="rgba(255,255,255,0.22)" />

              <Group x={offsetX} y={offsetY} scaleX={scale} scaleY={scale}>
                <Rect
                  x={0}
                  y={0}
                  width={canvas.width}
                  height={canvas.height}
                  fill="rgba(255,255,255,0.16)"
                  stroke="rgba(1,5,6,0.10)"
                  strokeWidth={2}
                  cornerRadius={18}
                  listening={false}
                />

                {/* Beds / structures / paths (basic: rect for now, still “as-is” positions + styles) */}
                {props.items
                  .filter((it) => it.type !== "tree" && it.type !== "label")
                  .map((it) => {
                    const s = it.style ?? {};
                    const fill = colorWithOpacity(s.fill, s.fillOpacity ?? 0.86, "#e9e2d6");
                    const stroke = colorWithOpacity(s.stroke, s.strokeOpacity ?? 0.12, "#010506");
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

                        {it.label ? (
                          <Text x={12} y={10} text={it.label} fontSize={14} fill="rgba(1,5,6,0.62)" listening={false} />
                        ) : null}
                      </Group>
                    );
                  })}

                {/* Trees */}
                {trees.map((t) => {
                  const variant = treeVariantFromMeta(t.meta);
                  const img = treeImg && variant === firstVariant ? treeImg : null;

                  return (
                    <Group key={t.id} x={t.x} y={t.y} rotation={t.r} listening={false}>
                      {img ? (
                        <KonvaImage image={img} width={t.w} height={t.h} />
                      ) : (
                        <Circle
                          x={t.w / 2}
                          y={t.h / 2}
                          radius={Math.min(t.w, t.h) / 2}
                          fill="rgba(46,125,50,0.35)"
                          stroke="rgba(1,5,6,0.12)"
                          strokeWidth={1}
                        />
                      )}
                    </Group>
                  );
                })}

                {/* Labels */}
                {labels.map((l) => (
                  <Text
                    key={l.id}
                    x={l.x}
                    y={l.y}
                    text={l.label ?? ""}
                    fontSize={Number(l.style?.fontSize ?? 16)}
                    fill={colorWithOpacity(l.style?.fill ?? "#010506", 0.65, "#010506")}
                    listening={false}
                  />
                ))}

                {/* Plantings (clickable) */}
                {plantingDots.map(({ p, x, y, bedId }) => {
                  const active = p.id === selectedPlantingId;
                  return (
                    <Circle
                      key={p.id}
                      x={x}
                      y={y}
                      radius={active ? 7 : 6}
                      fill={ROSE_BLUE}
                      stroke="rgba(1,5,6,0.18)"
                      strokeWidth={1}
                      onClick={(e) => {
                        e.cancelBubble = true;
                        setSelectedBedId(bedId);
                        setSelectedPlantingId(p.id);
                      }}
                    />
                  );
                })}
              </Group>
            </Layer>
          </Stage>
        </div>
      </div>

      <aside className="rounded-2xl border border-(--rose-border) bg-(--rose-surface) backdrop-blur shadow-sm p-5">
        {!selectedBed ? (
          <div className="text-sm text-(--rose-muted)">Click a bed (or a planting dot) to explore.</div>
        ) : (
          <>
            <div className="text-xs text-(--rose-muted)">Bed</div>
            <div className="mt-1 text-lg font-semibold text-(--rose-ink)">{selectedBed.label || "Bed"}</div>

            <div className="mt-4 border-t border-(--rose-border) pt-4">
              {!selectedPlanting ? (
                <div className="text-sm text-(--rose-muted)">No plantings for this bed yet.</div>
              ) : (
                (() => {
                  const card = roleCard(selectedPlanting, role);
                  return (
                    <div className="space-y-2">
                      <div className="text-xs text-(--rose-muted)">{card.subtitle}</div>
                      <div className="text-xl font-semibold text-(--rose-ink)">{card.title}</div>
                      {card.body ? (
                        <p className="text-sm leading-relaxed text-(--rose-ink) opacity-80">{card.body}</p>
                      ) : (
                        <p className="text-sm text-(--rose-muted)">(No notes yet for this role.)</p>
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
