"use client";

import { useMemo } from "react";
import { Stage, Layer, Rect, Text, Group, Circle } from "react-konva";
import type Konva from "konva";
import type { GardenPlanting } from "@/lib/garden/load-plantings";
import type { Item, PlantingsByBed } from "../types";
import { rgba, ROSE_BLUE } from "../utils";

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

export default function GardenMap(props: {
  stageRefSetter: (s: Konva.Stage | null) => void;

  viewport: { width: number; height: number };
  vp: { x: number; y: number; scale: number };
  isPinching: boolean;

  canvas: { width: number; height: number };
  items: Item[];
  plantingsByBed: PlantingsByBed;

  selectedBedId: string | null;

  onSelectBed: (bedId: string) => void;
  onSelectPin: (bedId: string, plantingId: string) => void;
  onTapBackground: () => void;

  onWheel: (e: any) => void;
  onTouchStart: (e: any) => void;
  onTouchMove: (e: any) => void;
  onTouchEnd: () => void;

  onDragEnd: (pos: { x: number; y: number }) => void;
}) {
  const safeW = clamp(Math.floor(props.viewport.width || 0), 1, 4096);
  const safeH = clamp(Math.floor(props.viewport.height || 0), 1, 4096);

  // safest for iPhone + transforms
  const pixelRatio = 1;

  const worldBg = useMemo(() => {
    const pad = 600;
    return { x: -pad, y: -pad, w: props.canvas.width + pad * 2, h: props.canvas.height + pad * 2 };
  }, [props.canvas.width, props.canvas.height]);

  return (
    <div className="absolute inset-0 touch-none select-none">
      <Stage
        ref={props.stageRefSetter as any}
        width={safeW}
        height={safeH}
        pixelRatio={pixelRatio}
        x={props.vp.x}
        y={props.vp.y}
        scaleX={props.vp.scale}
        scaleY={props.vp.scale}
        draggable={!props.isPinching}
        onWheel={props.onWheel}
        onTouchStart={(e) => {
          props.onTouchStart(e);

          // ✅ tap empty background clears selection (mobile)
          const stage = e.target?.getStage?.();
          if (stage && e.target === stage) props.onTapBackground();
        }}
        onTouchMove={props.onTouchMove}
        onTouchEnd={props.onTouchEnd}
        onDragEnd={(e) => props.onDragEnd({ x: e.target.x(), y: e.target.y() })}
        onMouseDown={(e) => {
          const stage = e.target.getStage();
          if (stage && e.target === stage) props.onTapBackground();
        }}
      >
        <Layer>
          <Rect x={worldBg.x} y={worldBg.y} width={worldBg.w} height={worldBg.h} fill="rgba(255,255,255,0.35)" />

          <Rect
            x={0}
            y={0}
            width={props.canvas.width}
            height={props.canvas.height}
            fill="rgba(255,255,255,0.16)"
            stroke="rgba(1,5,6,0.10)"
            strokeWidth={2}
            cornerRadius={18}
          />

          {props.items.map((it) => {
            const s = it.style ?? {};
            const fill = rgba(s.fill ?? "#e9e2d6", s.fillOpacity ?? 0.86);
            const stroke = rgba(s.stroke ?? "#010506", s.strokeOpacity ?? 0.10);
            const radius = s.radius ?? 16;
            const strokeWidth = s.strokeWidth ?? 1.2;

            const isBed = it.type === "bed";
            const isSelected = isBed && it.id === props.selectedBedId;

            return (
              <Group
                key={it.id}
                x={it.x}
                y={it.y}
                rotation={it.r}
                onClick={() => {
                  if (!isBed) return;
                  props.onSelectBed(it.id);
                }}
                onTap={() => {
                  if (!isBed) return;
                  props.onSelectBed(it.id);
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

                <Text x={12} y={10} text={it.label} fontSize={14} fill="rgba(1,5,6,0.62)" listening={false} />

                {isBed &&
                  (props.plantingsByBed.get(it.id) ?? [])
                    .filter((p) => p.pin_x != null && p.pin_y != null)
                    .map((p: GardenPlanting) => (
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
                          props.onSelectPin(it.id, p.id);
                        }}
                        onTap={(e) => {
                          // @ts-ignore react-konva tap event
                          e.cancelBubble = true;
                          props.onSelectPin(it.id, p.id);
                        }}
                      />
                    ))}
              </Group>
            );
          })}
        </Layer>
      </Stage>
    </div>
  );
}
