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
  onUpdatePlant: (
    bedId: string,
    plantId: string,
    patch: Partial<PlantBlock>
  ) => void;
  onRemovePlant: (bedId: string, plantId: string) => void;

  // pins (optional)
  pinPlacing?: { bedId: string; plantId: string } | null;
  onStartPinPlacing?: (bedId: string, plantId: string) => void;
  onCancelPinPlacing?: () => void;
  onRemovePin?: (bedId: string, plantId: string, pinId: string) => void;
  onUpdatePin?: (
    bedId: string,
    plantId: string,
    pinId: string,
    patch: Partial<PlantPin>
  ) => void;
}) {
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

  function bulkStyle(patch: Partial<StudioItem["style"]>) {
    props.selectedItems.forEach((it) => props.onUpdateStyle(it.id, patch));
  }

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

  // ✅ Multi selection
  if (isMulti) {
    return (
      <aside className="border-l border-black/10 bg-white/60 p-4 h-full overflow-auto">
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

  // ✅ SINGLE selection — narrow here (after early returns)
  const sel = props.selected;
  if (!sel) {
    return (
      <aside className="border-l border-black/10 bg-white/60 p-4 h-full overflow-auto">
        <div className="text-sm font-semibold tracking-tight">Inspector</div>
        <div className="mt-1 text-xs text-black/55">No selected item.</div>
      </aside>
    );
  }

  // ✅ Bed-only handle (prevents TS from complaining inside bed blocks)
  const bed: StudioItem | null = sel.type === "bed" ? sel : null;

  // Read plants only from bed; avoid assuming meta shape on other item types
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
          <div className="mt-1 text-sm font-medium">{sel.type}</div>

          <div className="mt-4 text-xs text-black/55">Label</div>
          <input
            value={sel.label}
            onChange={(e) => props.onUpdateItem(sel.id, { label: e.target.value })}
            className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm shadow-sm"
          />
        </div>

        {/* ✅ BED meta */}
        {bed ? (
          <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
            <div className="text-xs text-black/55">Bed status</div>
            <select
              value={(bed.meta as any)?.status ?? "dormant"}
              onChange={(e) => props.onUpdateMeta(bed.id, { status: e.target.value as any })}
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
                checked={!!(bed.meta as any)?.public}
                onChange={(e) => props.onUpdateMeta(bed.id, { public: e.target.checked })}
              />
            </label>

            {placingForThisBed ? (
              <div className="mt-4 rounded-xl border border-black/10 bg-[rgba(94,118,88,0.10)] p-3 text-xs text-black/70">
                Pin placing is active for this bed. Click inside the bed on the canvas to
                drop a pin.
                <div className="mt-2">
                  <button
                    className="rounded-lg border border-black/10 bg-white px-2 py-1 text-xs shadow-sm hover:bg-black/5"
                    onClick={() => props.onCancelPinPlacing?.()}
                  >
                    Cancel pin placing
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* ✅ ZONES */}
        {bed ? (
          <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="text-xs text-black/55">Zones inside this bed</div>
              <button
                className="rounded-lg border border-black/10 bg-white px-2 py-1 text-xs shadow-sm hover:bg-black/5"
                onClick={() => {
                  const next: ZoneBlock = {
                    id: uid("zone"),
                    name: `Zone ${zones.length + 1}`,
                    x: 0.1,
                    y: 0.1,
                    w: 0.3,
                    h: 0.22,
                    public: true,
                  };
                  patchZones([...zones, next]);
                }}
              >
                + Add zone
              </button>
            </div>

            {zones.length === 0 ? (
              <div className="mt-3 text-xs text-black/55">
                No zones yet. Use the Zone tool on the canvas to create zones where
                planting happens.
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                {zones.map((z) => (
                  <div key={z.id} className="rounded-xl border border-black/10 p-3">
                    <div className="flex items-center gap-2">
                      <input
                        value={z.name}
                        onChange={(e) =>
                          patchZones(
                            zones.map((x) =>
                              x.id === z.id ? { ...x, name: e.target.value } : x
                            )
                          )
                        }
                        className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm"
                        placeholder="Zone name"
                      />

                      <button
                        className="rounded-lg border border-black/10 bg-white px-2 py-2 text-xs shadow-sm hover:bg-black/5"
                        onClick={() => patchZones(zones.filter((x) => x.id !== z.id))}
                        title="Delete zone"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <label className="flex items-center justify-between gap-3 rounded-lg border border-black/10 bg-white px-3 py-2 text-xs">
                        <span className="text-black/60">Public</span>
                        <input
                          type="checkbox"
                          checked={z.public !== false}
                          onChange={(e) =>
                            patchZones(
                              zones.map((x) =>
                                x.id === z.id ? { ...x, public: e.target.checked } : x
                              )
                            )
                          }
                        />
                      </label>

                      <div className="rounded-lg border border-black/10 bg-white px-3 py-2 text-xs text-black/55">
                        Size: {Math.round(z.w * 100)}% × {Math.round(z.h * 100)}%
                      </div>
                    </div>

                    <textarea
                      value={z.note ?? ""}
                      onChange={(e) =>
                        patchZones(
                          zones.map((x) => (x.id === z.id ? { ...x, note: e.target.value } : x))
                        )
                      }
                      className="mt-2 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-xs"
                      placeholder="Optional note (rows, capacity, crop intent, etc.)"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {/* ✅ PLANTS */}
        {bed ? (
          <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="text-xs text-black/55">Plants in this bed</div>
              <button
                className="rounded-lg border border-black/10 bg-white px-2 py-1 text-xs shadow-sm hover:bg-black/5"
                onClick={() => props.onAddPlant(bed.id)}
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
                {plants.map((p) => {
                  const pins = p.pins ?? [];
                  const isPlacingThisPlant =
                    props.pinPlacing?.bedId === bed.id && props.pinPlacing?.plantId === p.id;

                  return (
                    <div key={p.id} className="rounded-xl border border-black/10 p-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={p.color}
                          onChange={(e) => props.onUpdatePlant(bed.id, p.id, { color: e.target.value })}
                          className="h-8 w-10 cursor-pointer rounded-lg border border-black/10 bg-white"
                        />
                        <input
                          value={p.name}
                          onChange={(e) => props.onUpdatePlant(bed.id, p.id, { name: e.target.value })}
                          className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm"
                          placeholder="Plant name"
                        />
                        <button
                          className="rounded-lg border border-black/10 bg-white px-2 py-2 text-xs shadow-sm hover:bg-black/5"
                          onClick={() => props.onRemovePlant(bed.id, p.id)}
                          title="Remove"
                        >
                          ✕
                        </button>
                      </div>

                      <textarea
                        value={p.note ?? ""}
                        onChange={(e) => props.onUpdatePlant(bed.id, p.id, { note: e.target.value })}
                        className="mt-2 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-xs"
                        placeholder="Optional note (variety, harvest window, etc.)"
                      />

                      <div className="mt-3 flex items-center justify-between">
                        <div className="text-[11px] text-black/55">
                          Pins: <span className="text-black/70">{pins.length}</span>
                        </div>

                        <button
                          className={`rounded-lg border px-2 py-1 text-xs shadow-sm ${
                            isPlacingThisPlant
                              ? "border-black/20 bg-black/5"
                              : "border-black/10 bg-white hover:bg-black/5"
                          }`}
                          onClick={() =>
                            isPlacingThisPlant
                              ? props.onCancelPinPlacing?.()
                              : props.onStartPinPlacing?.(bed.id, p.id)
                          }
                          title="Place a pin inside the bed"
                        >
                          {isPlacingThisPlant ? "Cancel pin" : "Place pin"}
                        </button>
                      </div>

                      {pins.length ? (
                        <div className="mt-2 space-y-2">
                          {pins.map((pin) => (
                            <div
                              key={pin.id}
                              className="flex items-center gap-2 rounded-lg border border-black/10 bg-white px-2 py-2"
                            >
                              <div
                                className="h-3 w-3 rounded-full border border-black/10"
                                style={{ background: p.color }}
                                title="Pin"
                              />
                              <input
                                value={pin.label ?? ""}
                                onChange={(e) =>
                                  props.onUpdatePin?.(bed.id, p.id, pin.id, {
                                    label: e.target.value,
                                  })
                                }
                                className="w-full rounded-md border border-black/10 bg-white px-2 py-1 text-[11px]"
                                placeholder="Pin label (optional)"
                              />
                              <button
                                className="rounded-md border border-black/10 bg-white px-2 py-1 text-[11px] hover:bg-black/5"
                                onClick={() => props.onRemovePin?.(bed.id, p.id, pin.id)}
                                title="Remove pin"
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </aside>
  );
}