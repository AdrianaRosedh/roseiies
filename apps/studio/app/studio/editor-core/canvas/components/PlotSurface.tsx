"use client";

import { Rect } from "react-konva";

export default function PlotSurface(props: {
  plotW: number;
  plotH: number;
  showPlotBoundary: boolean;

  noiseImg: HTMLImageElement | null;
  leafImg: HTMLImageElement | null;
  soilImg: HTMLImageElement | null;
  noiseOffset: { x: number; y: number };
  leafOffset: { x: number; y: number };
}) {
  const { plotW, plotH } = props;

  return (
    <>
      <Rect
        x={0}
        y={0}
        width={plotW}
        height={plotH}
        cornerRadius={26}
        fill="rgba(244,242,238,1)" // 🌱 light soil
        stroke={props.showPlotBoundary ? "rgba(15,23,42,0.10)" : "rgba(0,0,0,0)"}
        strokeWidth={props.showPlotBoundary ? 2 : 0}
        listening={false}
        perfectDrawEnabled={false}
      />
    </>
  );
}
