// apps/studio/app/studio/editor-core/canvas/components/PlotControls.tsx
"use client";

export default function PlotControls(props: {
  showPlotBoundary: boolean;
  setShowPlotBoundary: (v: boolean | ((p: boolean) => boolean)) => void;
  editPlot: boolean;
  setEditPlot: (v: boolean | ((p: boolean) => boolean)) => void;

  plotW: number;
  plotH: number;

  stageSize: { w: number; h: number };
  stageScale: number;
  setStagePos: (p: { x: number; y: number }) => void;
}) {
  return (
    <div className="absolute left-4 top-16 z-10 flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-3 py-2 text-xs text-black/70 shadow-sm backdrop-blur">
      <button
        type="button"
        className="rounded-full px-2 py-1 hover:bg-black/5 transition"
        onClick={() => props.setShowPlotBoundary((v) => !v)}
      >
        {props.showPlotBoundary ? "Hide boundary" : "Show boundary"}
      </button>

      <button
        type="button"
        className={[
          "rounded-full px-2 py-1 hover:bg-black/5 transition",
          props.editPlot ? "bg-black/5 ring-1 ring-black/10" : "",
        ].join(" ")}
        onClick={() => props.setEditPlot((v) => !v)}
      >
        {props.editPlot ? "Exit plot edit" : "Edit plot"}
      </button>

      <button
        type="button"
        className="rounded-full px-2 py-1 hover:bg-black/5 transition"
        onClick={() => {
          const cx = props.plotW / 2;
          const cy = props.plotH / 2;
          props.setStagePos({
            x: props.stageSize.w / 2 - cx * props.stageScale,
            y: props.stageSize.h / 2 - cy * props.stageScale,
          });
        }}
      >
        Focus
      </button>

      <span className="opacity-60">
        {Math.round(props.plotW)}×{Math.round(props.plotH)}
      </span>
    </div>
  );
}
