// apps/studio/app/studio/editor-core/Inspector.tsx
"use client";

import { useMemo } from "react";
import type { StudioItem, StudioModule, PlantBlock, PlantPin } from "./types";

type ZoneBlock = {
  id: string;
  name: string;
  x: number; // 0..1
  y: number; // 0..1
  w: number; // 0..1
  h: number; // 0..1
  public?: boolean;
  note?: string;
};

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function getZones(item: StudioItem): ZoneBlock[] {
  const m: any = item.meta as any;
  const z = m?.zones;
  return Array.isArray(z) ? (z as ZoneBlock[]) : [];
}

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

  // pins (optional)
  pinPlacing?: { bedId: string; plantId: string } | null;
  onStartPinPlacing?: (bedId: string, plantId: string) => void;
  onCancelPinPlacing?: () => void;
  onRemovePin?: (bedId: string, plantId: string, pinId: string) => void;
  onUpdatePin?: (bedId: string, plantId: string, pinId: string, patch: Partial<PlantPin>) => void;
}) {
  const isMulti = props.selectedIds.length > 1;
  useMemo(() => props.module.swatches, [props.module]); // keep memo (future)

  // ✅ No selection
  if (props.selectedIds.length === 0) {
    return (
      <aside className="border-l border-black/10 bg-white/60 p-4 h-full">
        <div className="text-sm font-semibold tracking-tight">Inspector</div>
        <div className="mt-1 text-xs text-black/55">Select an item to edit.</div>

        <div className="mt-6 rounded-2xl border border-black/10 bg-white p-4 text-sm text-black/60 shadow-sm">
          No selection.
        </div>
      </aside>
    );
  }

  // ✅ Multi selection: keep it minimal (bulk styling moved to Tools)
  if (isMulti) {
    return (
      <aside className="border-l border-black/10 bg-white/60 p-4 h-full overflow-auto">
        <div className="text-sm font-semibold tracking-tight">Inspector</div>
        <div className="mt-1 text-xs text-black/55">{props.selectedIds.length} selected</div>

        <div className="mt-6 rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
          <div className="text-xs text-black/55">Multiple selection</div>
          <div className="mt-2 text-xs text-black/55">
            Use <span className="font-medium">Garden Design</span> in Tools to style the canvas (defaults),
            or apply styles to the current selection.
          </div>
        </div>
      </aside>
    );
  }

  // ✅ SINGLE selection
  const sel = props.selected;
  if (!sel) {
    return (
      <aside className="border-l border-black/10 bg-white/60 p-4 h-full overflow-auto">
        <div className="text-sm font-semibold tracking-tight">Inspector</div>
        <div className="mt-1 text-xs text-black/55">No selected item.</div>
      </aside>
    );
  }

  // ✅ Bed-only handle
  const bed: StudioItem | null = sel.type === "bed" ? sel : null;

  const plants: PlantBlock[] = (bed?.meta as any)?.plants ?? [];
  const zones: ZoneBlock[] = bed ? getZones(bed) : [];
  const placingForThisBed = !!bed && props.pinPlacing?.bedId === bed.id;

  function patchZones(next: ZoneBlock[]) {
    if (!bed) return;
    props.onUpdateItem(bed.id, {
      meta: {
        ...(bed.meta as any),
        zones: next,
      } as any,
    });
  }

  return (
    <aside className="border-l border-black/10 bg-white/60 p-4 h-full overflow-auto">
      <div className="text-sm font-semibold tracking-tight">Inspector</div>
      <div className="mt-1 text-xs text-black/55">Edit item + contents.</div>

      <div className="mt-6 space-y-4">
        <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
          <div className="text-xs text-black/55">Type</div>
          <div className="mt-1 text-sm text-black/80">{sel.type}</div>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
          <div className="text-xs text-black/55">Label</div>
          <input
            value={sel.label ?? ""}
            onChange={(e) => props.onUpdateItem(sel.id, { label: e.target.value })}
            className="mt-2 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm"
          />
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
          <div className="text-xs text-black/55">Visibility</div>
          <label className="mt-2 flex items-center gap-2 text-sm text-black/75">
            <input
              type="checkbox"
              checked={!!sel.meta?.public}
              onChange={(e) => props.onUpdateMeta(sel.id, { public: e.target.checked })}
            />
            Public (guest viewer)
          </label>
        </div>

        {bed ? (
          <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="text-xs text-black/55">Plants</div>
              <button
                type="button"
                className="rounded-lg border border-black/10 bg-white px-3 py-2 text-xs shadow-sm hover:bg-black/5"
                onClick={() => props.onAddPlant(bed.id)}
              >
                + Add plant
              </button>
            </div>

            <div className="mt-3 space-y-3">
              {plants.length === 0 ? (
                <div className="text-xs text-black/55">No plants yet.</div>
              ) : (
                plants.map((p) => (
                  <div key={p.id} className="rounded-xl border border-black/10 bg-white/80 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <input
                        value={p.name}
                        onChange={(e) => props.onUpdatePlant(bed.id, p.id, { name: e.target.value })}
                        className="flex-1 rounded-lg border border-black/10 bg-white px-2 py-1 text-sm"
                      />
                      <button
                        type="button"
                        className="rounded-lg border border-black/10 bg-white px-2 py-1 text-xs hover:bg-black/5"
                        onClick={() => props.onRemovePlant(bed.id, p.id)}
                      >
                        Remove
                      </button>
                    </div>

                    <div className="mt-2 flex items-center gap-2">
                      <input
                        value={p.color}
                        onChange={(e) => props.onUpdatePlant(bed.id, p.id, { color: e.target.value })}
                        className="w-28 rounded-lg border border-black/10 bg-white px-2 py-1 text-xs"
                      />
                      <div className="h-4 w-4 rounded-full border border-black/10" style={{ background: p.color }} />
                      <span className="text-xs text-black/50">color</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : null}

        {/* NOTE: zones still exist in code; we’ll remove this section next when we delete zone concept */}
        {bed ? (
          <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="text-xs text-black/55">Zones (legacy)</div>
              <button
                type="button"
                className="rounded-lg border border-black/10 bg-white px-3 py-2 text-xs shadow-sm hover:bg-black/5"
                onClick={() => {
                  patchZones([
                    ...zones,
                    { id: uid("zone"), name: "Zone", x: 0.2, y: 0.2, w: 0.3, h: 0.3 },
                  ]);
                }}
              >
                + Add zone
              </button>
            </div>
            <div className="mt-2 text-xs text-black/55">
              We’ll replace zones with plant pins inside beds (data-driven). This stays temporarily.
            </div>
          </div>
        ) : null}

        {/* If you’re currently pinPlacing, you can keep that UI here later */}
        {placingForThisBed ? (
          <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
            <div className="text-xs text-black/55">Pin placing</div>
            <div className="mt-2 text-xs text-black/55">Click inside the bed to drop a pin.</div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
