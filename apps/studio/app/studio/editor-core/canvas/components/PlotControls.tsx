// apps/studio/app/studio/editor-core/canvas/components/PlotControls.tsx
"use client";

function Icon({ name }: { name: "boundary" | "plot" | "lock" | "focus" }) {
  // tiny inline icons (no dependency)
  if (name === "boundary")
    return (
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
        <rect x="4" y="4" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    );
  if (name === "plot")
    return (
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
        <path
          d="M5 14V6a2 2 0 0 1 2-2h8"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path
          d="M12 6h3v3"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    );
  if (name === "lock")
    return (
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
        <path
          d="M6.5 9V7.2A3.5 3.5 0 0 1 10 3.7A3.5 3.5 0 0 1 13.5 7.2V9"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <rect
          x="5.5"
          y="9"
          width="9"
          height="7.5"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.6"
        />
      </svg>
    );
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
      <path
        d="M10 3.8v3.2M10 13v3.2M3.8 10h3.2M13 10h3.2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="10" cy="10" r="3.2" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function RailButton(props: {
  active?: boolean;
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={props.title}
      onClick={props.onClick}
      className={[
        "h-10 w-10 rounded-xl border shadow-sm backdrop-blur transition",
        "flex items-center justify-center",
        props.active
          ? "bg-black/5 border-black/20 text-black/80"
          : "bg-white/70 border-black/10 text-black/60 hover:bg-black/5",
      ].join(" ")}
    >
      {props.children}
    </button>
  );
}

export default function PlotControls(props: {
  showPlotBoundary: boolean;
  setShowPlotBoundary: (v: boolean | ((p: boolean) => boolean)) => void;

  editPlot: boolean;
  setEditPlot: (v: boolean | ((p: boolean) => boolean)) => void;

  constrainView: boolean;
  setConstrainView: (v: boolean | ((p: boolean) => boolean)) => void;

  plotW: number;
  plotH: number;

  stageSize: { w: number; h: number };
  stageScale: number;
  setStagePos: (p: { x: number; y: number }) => void;
}) {
  return (
    <div className="absolute right-3 top-3 z-20 flex flex-col items-end gap-2 pointer-events-auto">
      <div className="flex flex-col gap-2">
        <RailButton
          active={props.showPlotBoundary}
          title={props.showPlotBoundary ? "Hide boundary" : "Show boundary"}
          onClick={() => props.setShowPlotBoundary((v) => !v)}
        >
          <Icon name="boundary" />
        </RailButton>

        <RailButton
          active={props.editPlot}
          title={props.editPlot ? "Exit plot edit" : "Edit plot size"}
          onClick={() => props.setEditPlot((v) => !v)}
        >
          <Icon name="plot" />
        </RailButton>

        <RailButton
          active={props.constrainView}
          title={props.constrainView ? "Constrained view" : "Infinite view"}
          onClick={() => props.setConstrainView((v) => !v)}
        >
          <Icon name="lock" />
        </RailButton>

        <RailButton
          title="Focus plot"
          onClick={() => {
            const cx = props.plotW / 2;
            const cy = props.plotH / 2;
            props.setStagePos({
              x: props.stageSize.w / 2 - cx * props.stageScale,
              y: props.stageSize.h / 2 - cy * props.stageScale,
            });
          }}
        >
          <Icon name="focus" />
        </RailButton>
      </div>

      <div className="text-[11px] text-black/45 pr-1">
        {Math.round(props.plotW)}×{Math.round(props.plotH)}
      </div>
    </div>
  );
}
