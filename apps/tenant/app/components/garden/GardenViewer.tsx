"use client";

import { Stage, Layer, Rect, Text, Group } from "react-konva";

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

function rgba(hex: string, opacity: number) {
  const h = String(hex ?? "#0b1220").replace("#", "").trim();
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}

export default function GardenViewer({
  canvas,
  items,
}: {
  canvas: { width: number; height: number };
  items: Item[];
}) {
  return (
    <div className="w-full overflow-hidden rounded-2xl border border-white/10 bg-white/5">
      <Stage width={900} height={560}>
        <Layer>
          <Rect
            x={0}
            y={0}
            width={900}
            height={560}
            fill="rgba(0,0,0,0.20)"
          />

          <Group x={24} y={24}>
            <Rect
              x={0}
              y={0}
              width={canvas.width}
              height={canvas.height}
              fill="rgba(255,255,255,0.06)"
              stroke="rgba(255,255,255,0.10)"
              strokeWidth={2}
              cornerRadius={18}
            />

            {items.map((it) => {
              const s = it.style ?? {};
              const fill = rgba(s.fill ?? "#e9e2d6", s.fillOpacity ?? 0.8);
              const stroke = rgba(s.stroke ?? "#f3f0e8", s.strokeOpacity ?? 0.18);
              const radius = s.radius ?? 16;
              const strokeWidth = s.strokeWidth ?? 1.2;

              return (
                <Group key={it.id} x={it.x} y={it.y} rotation={it.r}>
                  <Rect
                    width={it.w}
                    height={it.h}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                    cornerRadius={radius}
                  />
                  <Text
                    x={12}
                    y={10}
                    text={it.label}
                    fontSize={14}
                    fill="rgba(243,240,232,0.85)"
                    listening={false}
                  />
                </Group>
              );
            })}
          </Group>
        </Layer>
      </Stage>
    </div>
  );
}