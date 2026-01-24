// apps/studio/app/studio/editor-core/Inspector.tsx
"use client";

import { useMemo } from "react";
import type { StudioItem, StudioModule, PlantBlock, PlantPin } from "./types";

/* ---------------------------------------------
  Zones (v1 preset grid)
  Stored on bed.meta.zones as normalized rects:
  [{ code: "A", x:0, y:0, w:0.5, h:0.5 }, ...]
--------------------------------------------- */

type ZoneRect = { code: string; x: number; y: number; w: number; h: number };

type ZonePreset = "none" | "1x2" | "2x1" | "2x2" | "3x1" | "1x3";

const ZONE_PRESETS: Array<{ key: ZonePreset; label: string }> = [
  { key: "none", label: "None" },
  { key: "1x2", label: "1 × 2" },
  { key: "2x1", label: "2 × 1" },
  { key: "2x2", label: "2 × 2" },
  { key: "3x1", label: "3 × 1" },
  { key: "1x3", label: "1 × 3" },
];

function alphaCode(i: number) {
  // 0->A, 1->B ... 25->Z, 26->AA...
  let n = i;
  let s = "";
  while (n >= 0) {
    s = String.fromCharCode((n % 26) + 65) + s;
    n = Math.floor(n / 26) - 1;
  }
  return s;
}

function makeZones(preset: ZonePreset): ZoneRect[] {
  if (preset === "none") return [];

  let cols = 1;
  let rows = 1;

  if (preset === "1x2") {
    cols = 2;
    rows = 1;
  }
  if (preset === "2x1") {
    cols = 1;
    rows = 2;
  }
  if (preset === "2x2") {
    cols = 2;
    rows = 2;
  }
  if (preset === "3x1") {
    cols = 1;
    rows = 3;
  }
  if (preset === "1x3") {
    cols = 3;
    rows = 1;
  }

  const zones: ZoneRect[] = [];
  const w = 1 / cols;
  const h = 1 / rows;

  let idx = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      zones.push({
        code: alphaCode(idx++),
        x: c * w,
        y: r * h,
        w,
        h,
      });
    }
  }
  return zones;
}

function inferPresetFromZones(zones: any): ZonePreset {
  if (!Array.isArray(zones) || zones.length === 0) return "none";

  const xs = Array.from(
    new Set(
      zones
        .map((z) => Number(z?.x))
        .filter((n) => Number.isFinite(n))
        .map((n) => Number(n.toFixed(6)))
    )
  ).sort((a, b) => a - b);

  const ys = Array.from(
    new Set(
      zones
        .map((z) => Number(z?.y))
        .filter((n) => Number.isFinite(n))
        .map((n) => Number(n.toFixed(6)))
    )
  ).sort((a, b) => a - b);

  const cols = xs.length || 1;
  const rows = ys.length || 1;

  if (rows === 1 && cols === 1) return "none";
  if (rows === 1 && cols === 2) return "1x2";
  if (rows === 2 && cols === 1) return "2x1";
  if (rows === 2 && cols === 2) return "2x2";
  if (rows === 3 && cols === 1) return "3x1";
  if (rows === 1 && cols === 3) return "1x3";

  return "none";
}

function getZoneRects(item: StudioItem): ZoneRect[] {
  const m: any = item.meta as any;
  const z = m?.zones;
  if (!Array.isArray(z)) return [];
  // tolerate legacy shapes but keep only normalized rects with code
  return z
    .map((it: any) => ({
      code: String(it?.code ?? "").trim(),
      x: Number(it?.x),
      y: Number(it?.y),
      w: Number(it?.w),
      h: Number(it?.h),
    }))
    .filter(
      (z: ZoneRect) =>
        z.code &&
        Number.isFinite(z.x) &&
        Number.isFinite(z.y) &&
        Number.isFinite(z.w) &&
        Number.isFinite(z.h)
    );
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

  // ✅ Multi selection: keep it minimal
  if (isMulti) {
    return (
      <aside className="border-l border-black/10 bg-white/60 p-4 h-full overflow-auto">
        <div className="text-sm font-semibold tracking-tight">Inspector</div>
        <div className="mt-1 text-xs text-black/55">{props.selectedIds.length} selected</div>

        <div className="mt-6 rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
          <div className="text-xs text-black/55">Multiple selection</div>
          <div className="mt-2 text-xs text-black/55">
            Use <span className="font-medium">Tools</span> to style defaults, or apply styles to the current selection.
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
  const zones: ZoneRect[] = bed ? getZoneRects(bed) : [];
  const placingForThisBed = !!bed && props.pinPlacing?.bedId === bed.id;

  function setBedZones(next: ZoneRect[]) {
    if (!bed) return;
    props.onUpdateMeta(bed.id, { zones: next as any });
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

        {/* Zones (v1 preset grid) */}
        {bed ? (
          <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-xs text-black/55">Zones</div>
                <div className="mt-1 text-xs text-black/45">
                  Split this bed into zones so plantings can be assigned in Sheets.
                </div>
              </div>

              <button
                type="button"
                className="rounded-lg border border-black/10 bg-white px-2 py-1 text-xs hover:bg-black/5"
                onClick={() => setBedZones([])}
                title="Clear zones"
              >
                Clear
              </button>
            </div>

            <div className="mt-3 flex items-center gap-2">
              {(() => {
                const currentPreset = inferPresetFromZones(zones);

                return (
                  <>
                    <select
                      value={currentPreset}
                      onChange={(e) => {
                        const preset = e.target.value as ZonePreset;
                        setBedZones(makeZones(preset));
                      }}
                      className="flex-1 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm"
                    >
                      {ZONE_PRESETS.map((p) => (
                        <option key={p.key} value={p.key}>
                          {p.label}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm hover:bg-black/5"
                      onClick={() => setBedZones(makeZones(inferPresetFromZones(zones)))}
                      title="Regenerate zones"
                    >
                      Regenerate
                    </button>
                  </>
                );
              })()}
            </div>

            {zones.length ? (
              <div className="mt-3 text-xs text-black/55">
                Codes: <span className="font-medium">{zones.map((z) => z.code).join(", ")}</span>
              </div>
            ) : (
              <div className="mt-3 text-xs text-black/40">No zones yet. Pick a preset above.</div>
            )}
          </div>
        ) : null}

        {/* Pin placing (optional UI hook) */}
        {placingForThisBed ? (
          <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
            <div className="text-xs text-black/55">Pin placing</div>
            <div className="mt-2 text-xs text-black/55">
              Click inside the bed to drop a pin.
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
