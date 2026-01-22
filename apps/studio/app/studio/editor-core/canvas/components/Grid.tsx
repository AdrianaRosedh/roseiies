// apps/studio/app/studio/editor-core/canvas/components/Grid.tsx
"use client";

import { useMemo } from "react";
import { Line } from "react-konva";
import { clamp } from "../utils/math";

export default function Grid(props: {
  plotW: number;
  plotH: number;
  stageScale: number;
}) {
  const gridStep = 80;
  const showGrid = props.stageScale >= 0.55;
  const gridAlpha = clamp((props.stageScale - 0.55) / 0.9, 0, 1);
  const gridStroke = `rgba(94, 118, 88, ${0.03 + 0.06 * gridAlpha})`;

  const gridLinesX = useMemo(() => {
    const xs: number[] = [];
    for (let x = 0; x <= props.plotW; x += gridStep) xs.push(x);
    return xs;
  }, [props.plotW]);

  const gridLinesY = useMemo(() => {
    const ys: number[] = [];
    for (let y = 0; y <= props.plotH; y += gridStep) ys.push(y);
    return ys;
  }, [props.plotH]);

  if (!showGrid) return null;

  return (
    <>
      {gridLinesX.map((x) => (
        <Line
          key={`gx-${x}`}
          points={[x, 0, x, props.plotH]}
          stroke={gridStroke}
          strokeWidth={1}
          listening={false}
        />
      ))}
      {gridLinesY.map((y) => (
        <Line
          key={`gy-${y}`}
          points={[0, y, props.plotW, y]}
          stroke={gridStroke}
          strokeWidth={1}
          listening={false}
        />
      ))}
    </>
  );
}
