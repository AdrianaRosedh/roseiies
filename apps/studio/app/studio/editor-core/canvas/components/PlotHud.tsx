// apps/studio/app/studio/editor-core/canvas/components/PlotHud.tsx
"use client";

export default function PlotHud(props: {
  itemsCount: number;
  selectedCount: number;

  // Optional nicer label for current tool/mode
  modeLabel?: string;
}) {
  // ✅ If selection exists, FloatingToolbar is the UI. Hide PlotHud.
  if (props.selectedCount > 0) return null;

  return (
    <div className="absolute left-4 top-4 z-10 rounded-full border border-black/10 bg-white/70 px-3 py-2 text-xs text-black/70 shadow-sm backdrop-blur">
      {props.modeLabel ? (
        <span className="font-semibold text-black/70">{props.modeLabel}</span>
      ) : (
        <span className="font-semibold text-black/70">Map</span>
      )}
      <span className="text-black/35"> · </span>
      <span>{props.itemsCount} items</span>
      <span className="text-black/35"> · </span>
      <span className="text-black/60">Double-click to place</span>
    </div>
  );
}
