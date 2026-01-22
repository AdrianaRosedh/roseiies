"use client";

import type { ItemStyle, StudioModule, ItemType, Swatch } from "./types";

export default function LeftToolbar(props: {
  module: StudioModule;
  tool: ItemType;
  setTool: (t: ItemType) => void;

  // ✅ NEW: design defaults + optional apply-to-selection
  bedDefaultStyle?: ItemStyle;
  onSetBedDefaultStyle?: (patch: Partial<ItemStyle>) => void;

  selectedCount?: number;
  onApplyStyleToSelected?: (patch: Partial<ItemStyle>) => void;
}) {
  const swatches = props.module.swatches;
  const bedStyle = props.bedDefaultStyle;

  return (
    <aside className="border-r border-black/10 bg-white/60 p-4">
      <div className="text-xs text-black/55">
        Double-click to drop · Scroll to zoom · Hold space to pan · Cmd/Ctrl+C/V/D
      </div>

      {/* ✅ Garden Design (always visible) */}
      <div className="mt-5 rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold text-black/70">Garden Design</div>
          {props.selectedCount && props.selectedCount > 0 ? (
            <span className="text-[11px] text-black/45">{props.selectedCount} selected</span>
          ) : null}
        </div>

        <div className="mt-3">
          <div className="text-[11px] text-black/55">Bed fill (default)</div>

          <div className="mt-2 flex flex-wrap gap-2">
            {swatches.map((s) => (
              <SwatchChip
                key={s.name}
                swatch={s}
                active={!!bedStyle && normalizeHex(bedStyle.fill) === normalizeHex(s.value)}
                onClick={() => props.onSetBedDefaultStyle?.({ fill: s.value })}
                title={`Set default bed fill: ${s.name}`}
              />
            ))}
          </div>

          {props.selectedCount && props.selectedCount > 0 ? (
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                className="flex-1 rounded-xl border border-black/10 bg-white/80 px-3 py-2 text-xs shadow-sm hover:bg-black/5"
                onClick={() => {
                  // apply current default to selection
                  if (!bedStyle) return;
                  props.onApplyStyleToSelected?.({ fill: bedStyle.fill });
                }}
              >
                Apply default to selection
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* ✅ Tools (bed-only for now via module.tools) */}
      <div className="mt-5 space-y-2">
        {props.module.tools.map((t) => (
          <ToolButton
            key={t.id}
            label={t.label}
            active={props.tool === t.id}
            onClick={() => props.setTool(t.id)}
          />
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
        <div className="text-xs text-black/60">Tip</div>
        <div className="mt-2 text-xs text-black/55">
          Cursor paste: copy, move mouse, paste — it lands under your cursor.
        </div>
      </div>
    </aside>
  );
}

function ToolButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-2xl border px-4 py-3 text-left text-sm transition shadow-sm ${
        active ? "border-black/15 bg-black/5" : "border-black/10 bg-white hover:bg-black/5"
      }`}
    >
      {label}
    </button>
  );
}

function SwatchChip({
  swatch,
  active,
  onClick,
  title,
}: {
  swatch: Swatch;
  active: boolean;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`rounded-full border px-2 py-1 text-[11px] shadow-sm hover:bg-black/5 ${
        active ? "border-black/20 bg-black/5" : "border-black/10 bg-white"
      }`}
    >
      <span className="inline-flex items-center gap-2">
        <span
          className="h-4 w-4 rounded-full border border-black/10"
          style={{ background: swatch.value }}
        />
        <span className="text-black/70">{swatch.name}</span>
      </span>
    </button>
  );
}

function normalizeHex(v: string) {
  return (v || "").trim().toLowerCase();
}