// apps/studio/app/studio/editor-core/canvas/components/PlotHud.tsx
"use client";

export default function PlotHud(props: { itemsCount: number; selectedCount: number }) {
  return (
    <div className="absolute left-4 top-4 z-10 rounded-full border border-black/10 bg-white/70 px-3 py-2 text-xs text-black/70 shadow-sm backdrop-blur">
      Plot · {props.itemsCount} items · Selected: {props.selectedCount} · Double-click to place
    </div>
  );
}
