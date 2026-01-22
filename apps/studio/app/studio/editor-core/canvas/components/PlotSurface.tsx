// apps/studio/app/studio/editor-core/canvas/components/PlotSurface.tsx
"use client";

import { Rect } from "react-konva";

export default function PlotSurface(props: {
  plotW: number;
  plotH: number;
  showPlotBoundary: boolean;

  noiseImg: HTMLImageElement | null;
  leafImg: HTMLImageElement | null;
  soilImg: HTMLImageElement | null; // not used here, but handy
  noiseOffset: { x: number; y: number };
  leafOffset: { x: number; y: number };
}) {
  const { plotW, plotH } = props;

  return (
    <>
      {/* Plot boundary */}
      <Rect
        x={0}
        y={0}
        width={plotW}
        height={plotH}
        cornerRadius={26}
        fillLinearGradientStartPoint={{ x: 0, y: 0 }}
        fillLinearGradientEndPoint={{ x: 0, y: plotH }}
        fillLinearGradientColorStops={[
          0,
          "rgba(249,247,242,1)",
          0.22,
          "rgba(243,236,226,1)",
          0.62,
          "rgba(234,223,206,1)",
          1,
          "rgba(224,209,188,1)",
        ]}
        stroke={props.showPlotBoundary ? "rgba(56, 72, 56, 0.12)" : "rgba(0,0,0,0)"}
        strokeWidth={props.showPlotBoundary ? 2 : 0}
        shadowColor={props.showPlotBoundary ? "rgba(15,23,42,0.07)" : "rgba(0,0,0,0)"}
        shadowBlur={props.showPlotBoundary ? 14 : 0}
        shadowOffsetX={0}
        shadowOffsetY={props.showPlotBoundary ? 10 : 0}
        shadowEnabled={props.showPlotBoundary}
        listening={false}
      />

      {/* Edge depth */}
      <Rect
        x={0}
        y={0}
        width={plotW}
        height={plotH}
        cornerRadius={26}
        fillLinearGradientStartPoint={{ x: 0, y: 0 }}
        fillLinearGradientEndPoint={{ x: 0, y: plotH }}
        fillLinearGradientColorStops={[
          0,
          "rgba(0,0,0,0.12)",
          0.08,
          "rgba(0,0,0,0.02)",
          0.92,
          "rgba(0,0,0,0.04)",
          1,
          "rgba(0,0,0,0.16)",
        ]}
        opacity={0.55}
        listening={false}
      />

      {/* Grain */}
      {props.noiseImg ? (
        <Rect
          x={0}
          y={0}
          width={plotW}
          height={plotH}
          fillPatternImage={props.noiseImg}
          fillPatternRepeat="repeat"
          fillPatternOffset={props.noiseOffset}
          fillPatternScale={{ x: 1, y: 1 }}
          opacity={0.1}
          listening={false}
        />
      ) : null}

      {/* Leaf speckles */}
      {props.leafImg ? (
        <Rect
          x={0}
          y={0}
          width={plotW}
          height={plotH}
          fillPatternImage={props.leafImg}
          fillPatternRepeat="repeat"
          fillPatternOffset={props.leafOffset}
          fillPatternScale={{ x: 1, y: 1 }}
          opacity={0.12}
          listening={false}
        />
      ) : null}

      {/* Soft vignette */}
      <Rect
        x={0}
        y={0}
        width={plotW}
        height={plotH}
        cornerRadius={26}
        fillRadialGradientStartPoint={{ x: plotW * 0.48, y: plotH * 0.42 }}
        fillRadialGradientEndPoint={{ x: plotW * 0.48, y: plotH * 0.42 }}
        fillRadialGradientStartRadius={plotW * 0.18}
        fillRadialGradientEndRadius={plotW * 0.92}
        fillRadialGradientColorStops={[
          0,
          "rgba(255,255,255,0.20)",
          1,
          "rgba(255,255,255,0)",
        ]}
        opacity={0.28}
        listening={false}
      />
    </>
  );
}
