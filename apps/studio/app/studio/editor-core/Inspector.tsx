"use client";

import { useMemo } from "react";
import type { StudioItem, StudioModule, PlantBlock } from "./types";

export default function Inspector(props: {
  module: StudioModule;

  selectedIds: string[];
  selected: StudioItem | null;
  selectedItems: StudioItem[];

  onUpdateItem: (id: string, patch: Partial<StudioItem>) => void;
  onUpdateMeta: (id: string, patch: Partial<StudioItem["meta"]>) => void;
  onUpdateStyle: (id: string, patch: Partial<StudioItem["style"]>) => void;

  onAddPlant: (bedId: string) => void;
  onUpdatePlant: (bedId: string, plantId: string, patch: Partial<PlantBlock>) => void;
  onRemovePlant: (bedId: string, plantId: string) => void;
}) {
  const sel = props.selected;
  const isMulti = props.selectedIds.length > 1;

  const swatches = useMemo(() => props.module.swatches, [props.module]);

  async function pickColor(): Promise<string | null> {
    const AnyWindow = window as any;
    if (!AnyWindow.EyeDropper) return null;
    try {
      const ed = new AnyWindow.EyeDropper();
      const res = await ed.open();
      return res?.sRGBHex ?? null;
    } catch {
      return null;
    }
  }

  // Multi selection bulk style
  function bulkStyle(patch: Partial<StudioItem["style"]>) {
    props.selectedItems.forEach((it) => props.onUpdateStyle(it.id, patch));
  }

  if (props.selectedIds.length === 0) {
    return (
      <aside className="border-l border-black/10 bg-white/60 p-4">
        <div className="text-sm font-semibold tracking-tight">Inspector</div>
        <div className="mt-1 text-xs text-black/55">Select an item to edit.</div>

        <div className="mt-6 rounded-2xl border border-black/10 bg-white p-4 text-sm text-black/60 shadow-sm">
          No selection.
        </div>
      </aside>
    );
  }

  if (isMulti) {
    return (
      <aside className="border-l border-black/10 bg-white/60 p-4">
        <div className="text-sm font-semibold tracking-tight">Inspector</div>
        <div className="mt-1 text-xs text-black/55">
          {props.selectedIds.length} selected · bulk style
        </div>

        <div className="mt-6 space-y-4">
          <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
            <div className="text-xs text-black/55">Bulk Fill</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {swatches.map((s) => (
                <button
                  key={s.name}
                  className="rounded-full border border-black/10 bg-white px-2 py-1 text-[11px] shadow-sm hover:bg-black/5"
                  onClick={() => bulkStyle({ fill: s.value })}
                  title={`Fill: ${s.name}`}
                >
                  <span className="inline-flex items-center gap-2">
                    <span
                      className="h-4 w-4 rounded-full border border-black/10"
                      style={{ background: s.value }}
                    />
                    <span className="text-black/70">{s.name}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
            <div className="text-xs text-black/55">Eyedropper (bulk)</div>
            <div className="mt-3 flex gap-2">
              <button
                className="rounded-lg border border-black/10 bg-white px-3 py-2 text-xs shadow-sm hover:bg-black/5"
                onClick={async () => {
                  const c = await pickColor();
                  if (c) bulkStyle({ fill: c });
                }}
                disabled={typeof (window as any).EyeDropper === "undefined"}
              >
                Pick → Fill
              </button>

              <button
                className="rounded-lg border border-black/10 bg-white px-3 py-2 text-xs shadow-sm hover:bg-black/5"
                onClick={async () => {
                  const c = await pickColor();
                  if (c) bulkStyle({ stroke: c });
                }}
                disabled={typeof (window as any).EyeDropper === "undefined"}
              >
                Pick → Stroke
              </button>
            </div>
          </div>
        </div>
      </aside>
    );
  }

  // Single selection
  if (!sel) return null;

  const plants = sel.meta.plants ?? [];

  return (
    <aside className="border-l border-black/10 bg-white/60 p-4">
      <div className="text-sm font-semibold tracking-tight">Inspector</div>
      <div className="mt-1 text-xs text-black/55">Edit item + contents.</div>

      <div className="mt-6 space-y-4">
        <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
          <div className="text-xs text-black/55">Type</div>
          <div className="mt-1 text-sm font-medium">{sel.type}</div>

          <div className="mt-4 text-xs text-black/55">Label</div>
          <input
            value={sel.label}
            onChange={(e) => props.onUpdateItem(sel.id, { label: e.target.value })}
            className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm shadow-sm"
          />
        </div>

        {sel.type === "bed" ? (
          <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
            <div className="text-xs text-black/55">Bed status</div>
            <select
              value={sel.meta.status ?? "dormant"}
              onChange={(e) => props.onUpdateMeta(sel.id, { status: e.target.value as any })}
              className="mt-2 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm shadow-sm"
            >
              <option value="abundant">abundant</option>
              <option value="fragile">fragile</option>
              <option value="dormant">dormant</option>
            </select>

            <label className="mt-4 flex items-center justify-between gap-3 text-sm">
              <span className="text-xs text-black/55">Public</span>
              <input
                type="checkbox"
                checked={!!sel.meta.public}
                onChange={(e) => props.onUpdateMeta(sel.id, { public: e.target.checked })}
              />
            </label>
          </div>
        ) : null}

        {/* Plants inside bed */}
        {sel.type === "bed" ? (
          <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="text-xs text-black/55">Plants in this bed</div>
              <button
                className="rounded-lg border border-black/10 bg-white px-2 py-1 text-xs shadow-sm hover:bg-black/5"
                onClick={() => props.onAddPlant(sel.id)}
              >
                + Add
              </button>
            </div>

            {plants.length === 0 ? (
              <div className="mt-3 text-xs text-black/55">
                No plants yet. Add one to represent mixed planting.
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                {plants.map((p) => (
                  <div key={p.id} className="rounded-xl border border-black/10 p-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={p.color}
                        onChange={(e) => props.onUpdatePlant(sel.id, p.id, { color: e.target.value })}
                        className="h-8 w-10 cursor-pointer rounded-lg border border-black/10 bg-white"
                      />
                      <input
                        value={p.name}
                        onChange={(e) => props.onUpdatePlant(sel.id, p.id, { name: e.target.value })}
                        className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm"
                        placeholder="Plant name"
                      />
                      <button
                        className="rounded-lg border border-black/10 bg-white px-2 py-2 text-xs shadow-sm hover:bg-black/5"
                        onClick={() => props.onRemovePlant(sel.id, p.id)}
                        title="Remove"
                      >
                        ✕
                      </button>
                    </div>

                    <textarea
                      value={p.note ?? ""}
                      onChange={(e) => props.onUpdatePlant(sel.id, p.id, { note: e.target.value })}
                      className="mt-2 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-xs"
                      placeholder="Optional note (variety, row count, harvest window, etc.)"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </aside>
  );
}