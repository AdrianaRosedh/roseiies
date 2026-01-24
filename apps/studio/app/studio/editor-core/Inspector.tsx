// apps/studio/app/studio/editor-core/Inspector.tsx
"use client";

import React, { useMemo, useState } from "react";
import type { StudioItem, StudioModule } from "./types";

/* ---------------------------------------------
  Read-only plantings feed (from Sheets / API)
--------------------------------------------- */
type PlantingRow = {
  id: string;
  bed_id: string | null; // bed OR tree item id
  zone_code: string | null;
  crop: string | null;
  status: string | null;
  planted_at: string | null;
  pin_x: number | null;
  pin_y: number | null;
};

/* ---------------------------------------------
  Zones (normalized rects in bed.meta.zones)
--------------------------------------------- */
type ZoneRect = { code: string; x: number; y: number; w: number; h: number };

type ZonePreset = "none" | "1x2" | "2x1" | "2x2" | "3x1" | "1x3";

const ZONE_PRESETS: Array<{ key: ZonePreset; label: string; cols: number; rows: number }> = [
  { key: "none", label: "None", cols: 1, rows: 1 },
  { key: "1x2", label: "1 × 2", cols: 2, rows: 1 },
  { key: "2x1", label: "2 × 1", cols: 1, rows: 2 },
  { key: "2x2", label: "2 × 2", cols: 2, rows: 2 },
  { key: "3x1", label: "3 × 1", cols: 1, rows: 3 },
  { key: "1x3", label: "1 × 3", cols: 3, rows: 1 },
];

function alphaCode(i: number) {
  let n = i;
  let s = "";
  while (n >= 0) {
    s = String.fromCharCode((n % 26) + 65) + s;
    n = Math.floor(n / 26) - 1;
  }
  return s;
}

function makeZonesFromPreset(preset: ZonePreset): ZoneRect[] {
  const p = ZONE_PRESETS.find((z) => z.key === preset) ?? ZONE_PRESETS[0];
  if (p.key === "none") return [];

  const { cols, rows } = p;
  const w = 1 / cols;
  const h = 1 / rows;

  const zones: ZoneRect[] = [];
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

function inferPresetFromZones(zones: ZoneRect[]): ZonePreset {
  if (!zones?.length) return "none";

  const xs = Array.from(new Set(zones.map((z) => Number(z.x.toFixed(6))))).sort((a, b) => a - b);
  const ys = Array.from(new Set(zones.map((z) => Number(z.y.toFixed(6))))).sort((a, b) => a - b);

  const cols = xs.length || 1;
  const rows = ys.length || 1;

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
  return z
    .map((it: any) => ({
      code: String(it?.code ?? "").trim(),
      x: Number(it?.x),
      y: Number(it?.y),
      w: Number(it?.w),
      h: Number(it?.h),
    }))
    .filter(
      (r: ZoneRect) =>
        !!r.code &&
        Number.isFinite(r.x) &&
        Number.isFinite(r.y) &&
        Number.isFinite(r.w) &&
        Number.isFinite(r.h)
    );
}

/* ---------------------------------------------
  Naming helpers
--------------------------------------------- */
function niceType(t: StudioItem["type"]) {
  if (t === "bed") return "Garden bed";
  if (t === "tree") return "Tree";
  if (t === "path") return "Path";
  if (t === "structure") return "Structure";
  if (t === "label") return "Label";
  if (t === "zone") return "Zone";
  return t;
}

function Chip(props: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-black/10 bg-white px-2 py-0.5 text-[10px] text-black/60">
      {props.children}
    </span>
  );
}

/* ---------------------------------------------
  Apple/Google-style compact toggle
--------------------------------------------- */
function Switch(props: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      aria-pressed={props.checked}
      onClick={() => props.onChange(!props.checked)}
      className={[
        "relative inline-flex h-4.5 w-8 items-center rounded-full border border-black/10 transition-colors",
        props.checked ? "bg-black/80" : "bg-black/10",
      ].join(" ")}
    >
      <span
        className={[
          "inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform",
          props.checked ? "translate-x-3.5" : "translate-x-0.5",
        ].join(" ")}
      />
    </button>
  );
}

/* ---------------------------------------------
  Compact section (no chunky cards)
  - Minimal padding
  - Soft divider (Apple-ish)
  - Optional collapse (defaults chosen to avoid overflow => no scrolling needed)
--------------------------------------------- */
function Section(props: {
  title: string;
  right?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(props.defaultOpen ?? false);

  return (
    <div className="rounded-xl border border-black/10 bg-white/70">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-3 py-2 flex items-center justify-between gap-2"
      >
        <div className="text-[12px] font-semibold text-black/80">{props.title}</div>
        <div className="flex items-center gap-2">
          {props.right}
          <span className={`text-black/35 transition-transform ${open ? "rotate-90" : ""}`}>›</span>
        </div>
      </button>

      <div className={`grid transition-[grid-template-rows] duration-200 ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden">
          <div className="border-t border-black/10 px-3 py-2">{props.children}</div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------
  Component
--------------------------------------------- */
export default function Inspector(props: {
  module: StudioModule;

  selectedIds: string[];
  selected: StudioItem | null;
  selectedItems: StudioItem[];

  onUpdateItem: (id: string, patch: Partial<StudioItem>) => void;
  onUpdateMeta: (id: string, patch: Partial<StudioItem["meta"]>) => void;
  onUpdateStyle: (id: string, patch: Partial<StudioItem["style"]>) => void;

  plantings?: PlantingRow[];
}) {
  const isMulti = props.selectedIds.length > 1;

  // ✅ no panel scrolling: the panel itself is "fit"
  // We keep content compact + default-close sections to avoid overflow.
  // If you add more fields later, you can selectively open/close or re-enable scroll.
  const PANEL_CLASS =
    "h-full border-l border-black/10 bg-white/60 flex flex-col overflow-hidden";

  // Empty selection
  if (props.selectedIds.length === 0) {
    return (
      <aside className={PANEL_CLASS}>
        <div className="px-4 py-3 border-b border-black/10">
          <div className="text-[13px] font-semibold text-black/85">Details</div>
          <div className="mt-1 text-[11px] text-black/55">Select an element.</div>
        </div>
        <div className="p-4 text-[12px] text-black/55">Nothing selected.</div>
      </aside>
    );
  }

  // Multi selection
  if (isMulti) {
    return (
      <aside className={PANEL_CLASS}>
        <div className="px-4 py-3 border-b border-black/10">
          <div className="text-[13px] font-semibold text-black/85">Details</div>
          <div className="mt-1 text-[11px] text-black/55">{props.selectedIds.length} selected</div>
        </div>
        <div className="p-4 text-[12px] text-black/60">
          Multiple selected. Use the left sidebar for align/distribute.
        </div>
      </aside>
    );
  }

  const sel = props.selected;
  if (!sel) {
    return (
      <aside className={PANEL_CLASS}>
        <div className="px-4 py-3 border-b border-black/10">
          <div className="text-[13px] font-semibold text-black/85">Details</div>
          <div className="mt-1 text-[11px] text-black/55">No selected item.</div>
        </div>
      </aside>
    );
  }

  // ✅ capture for closures (avoid TS complaining)
  const selId = sel.id;

  const isBed = sel.type === "bed";
  const isTree = sel.type === "tree";

  const zones = isBed ? getZoneRects(sel) : [];
  const currentPreset = inferPresetFromZones(zones);

  const code = (sel.meta as any)?.code ? String((sel.meta as any).code) : null;

  const plantings = (props.plantings ?? []).filter((p) => p.bed_id === selId);

  const byZone = useMemo(() => {
    const m = new Map<string, PlantingRow[]>();
    for (const p of plantings) {
      const k = (p.zone_code ?? "").trim() || "Unzoned";
      m.set(k, [...(m.get(k) ?? []), p]);
    }
    return m;
  }, [plantings]);

  const zoneKeysSorted = useMemo(() => {
    const keys = Array.from(byZone.keys());
    return keys.sort((a, b) => {
      if (a === "Unzoned") return 1;
      if (b === "Unzoned") return -1;
      return a.localeCompare(b);
    });
  }, [byZone]);

  function setBedZones(next: ZoneRect[]) {
    if (!isBed) return;
    props.onUpdateMeta(selId, { zones: next as any });
  }

  const headerLabel =
    sel.label?.trim()
      ? sel.label.trim()
      : isBed
      ? "Untitled bed"
      : isTree
      ? "Untitled tree"
      : "Untitled";

  const guestVisible = !!sel.meta?.public;

  return (
    <aside className={PANEL_CLASS}>
      {/* Header (compact, no extra fuss) */}
      <div className="px-4 py-3 border-b border-black/10">
        <div className="text-[13px] font-semibold text-black/85">Details</div>

        <div className="mt-1 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[12px] text-black/75 truncate">{headerLabel}</div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              <Chip>{niceType(sel.type)}</Chip>
              {code ? <Chip>Code {code}</Chip> : null}
            </div>
          </div>

          {/* Guest visibility quick toggle */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] text-black/45">Guest</span>
            <Switch
              checked={guestVisible}
              onChange={(v) => props.onUpdateMeta(selId, { public: v })}
            />
          </div>
        </div>

        {/* Name inline (compact row) */}
        <div className="mt-2 flex items-center gap-2">
          <span className="text-[11px] text-black/45 w-10">Name</span>
          <input
            value={sel.label ?? ""}
            onChange={(e) => props.onUpdateItem(selId, { label: e.target.value })}
            className="flex-1 rounded-lg border border-black/10 bg-white px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-black/10"
            placeholder={isBed ? "e.g. Huerto 1" : "e.g. Tree 01"}
          />
        </div>
      </div>

      {/* Content (no scrolling) */}
      <div className="p-3 space-y-2">
        {/* Zones FIRST (and open by default) */}
        {isBed ? (
          <Section
            title="Zones"
            defaultOpen={true}
            right={
              <button
                type="button"
                className="rounded-md border border-black/10 bg-white px-2 py-1 text-[11px] text-black/60 hover:bg-black/5"
                onClick={() => setBedZones([])}
              >
                Clear
              </button>
            }
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-[11px] text-black/50">
                  Current:{" "}
                  <span className="text-black/70 font-medium">
                    {zones.length ? zones.map((z) => z.code).join(", ") : "None"}
                  </span>
                </div>
              </div>

              {zones.length === 0 ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="flex-1 rounded-lg bg-black px-3 py-2 text-[12px] text-white hover:bg-black/90"
                    onClick={() => setBedZones(makeZonesFromPreset("2x2"))}
                  >
                    Create (2×2)
                  </button>

                  <select
                    defaultValue="2x2"
                    onChange={(e) => setBedZones(makeZonesFromPreset(e.target.value as ZonePreset))}
                    className="rounded-lg border border-black/10 bg-white px-2.5 py-2 text-[12px] outline-none focus:ring-2 focus:ring-black/10"
                    title="Preset"
                  >
                    {ZONE_PRESETS.filter((p) => p.key !== "none").map((p) => (
                      <option key={p.key} value={p.key}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <select
                    value={currentPreset}
                    onChange={(e) => setBedZones(makeZonesFromPreset(e.target.value as ZonePreset))}
                    className="flex-1 rounded-lg border border-black/10 bg-white px-2.5 py-2 text-[12px] outline-none focus:ring-2 focus:ring-black/10"
                  >
                    {ZONE_PRESETS.map((p) => (
                      <option key={p.key} value={p.key}>
                        {p.label}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    className="rounded-lg border border-black/10 bg-white px-3 py-2 text-[12px] text-black/70 hover:bg-black/5"
                    onClick={() => {
                      const preset = currentPreset === "none" ? "2x2" : currentPreset;
                      setBedZones(makeZonesFromPreset(preset));
                    }}
                  >
                    Regen
                  </button>
                </div>
              )}

              <div className="text-[10px] text-black/45 leading-snug">
                Zone codes (A, B, C…) are used in Sheets to assign plantings to specific parts of this bed.
              </div>
            </div>
          </Section>
        ) : null}

        {/* Plantings LAST (closed by default to avoid overflow / scroll) */}
        {(isBed || isTree) ? (
          <Section
            title="Plantings"
            defaultOpen={false}
            right={<span className="text-[11px] text-black/45">{plantings.length}</span>}
          >
            {plantings.length === 0 ? (
              <div className="text-[12px] text-black/55">No plantings assigned yet.</div>
            ) : (
              <div className="space-y-2">
                {zoneKeysSorted.map((zone) => {
                  const rows = byZone.get(zone) ?? [];
                  return (
                    <div key={zone} className="rounded-lg border border-black/10 bg-white">
                      <div className="px-3 py-2 flex items-center justify-between">
                        <div className="text-[12px] font-semibold text-black/75">
                          {isBed ? (zone === "Unzoned" ? "Unzoned" : `Zone ${zone}`) : "Tree"}
                        </div>
                        <div className="text-[11px] text-black/45">{rows.length}</div>
                      </div>

                      <div className="border-t border-black/10">
                        {rows.map((r) => (
                          <div key={r.id} className="px-3 py-2 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-[13px] text-black/80 truncate">{r.crop ?? "—"}</div>
                              <div className="text-[11px] text-black/45">
                                {r.status ?? "—"}
                                {r.planted_at ? ` • ${r.planted_at}` : ""}
                              </div>
                            </div>
                            <div className="shrink-0 text-[11px] text-black/45">
                              {r.pin_x != null && r.pin_y != null ? "Pinned" : ""}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-2 text-[10px] text-black/45 leading-snug">
              Plantings are managed in Sheets. This panel reflects assignments automatically.
            </div>
          </Section>
        ) : null}
      </div>
    </aside>
  );
}
