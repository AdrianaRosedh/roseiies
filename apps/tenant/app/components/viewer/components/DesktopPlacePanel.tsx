"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { BedResult, CropResult } from "./SearchResultsPopover";
import SearchBar from "./SearchBar";

type Planting = {
  id: string;
  crop?: string | null;
  status?: string | null;
  guest_story?: string | null;
  gardener_notes?: string | null;
  kitchen_notes?: string | null;
};

type Mode = "collapsed" | "search" | "details";

const ACCENT = "#fb7185";
const INK = "rgba(15, 23, 42, 0.92)";
const MUTED = "rgba(15, 23, 42, 0.58)";
const BORDER = "rgba(15, 23, 42, 0.12)";
const SURFACE = "rgba(255,255,255,0.78)";
const SURFACE_2 = "rgba(255,255,255,0.92)";
const SHADOW = "0 18px 40px rgba(0,0,0,0.10)";

function Icon(props: { children: React.ReactNode }) {
  return (
    <div
      style={{
        width: 38,
        height: 38,
        borderRadius: 12,
        display: "grid",
        placeItems: "center",
        border: `1px solid ${BORDER}`,
        background: SURFACE_2,
        boxShadow: "0 8px 18px rgba(0,0,0,0.06)",
      }}
    >
      {props.children}
    </div>
  );
}

function Btn(props: {
  active?: boolean;
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      title={props.title}
      style={{
        all: "unset",
        cursor: "pointer",
        borderRadius: 14,
        padding: 4,
        background: props.active ? "rgba(251,113,133,0.14)" : "transparent",
      }}
    >
      {props.children}
    </button>
  );
}

function HeaderBlock(props: { title: string; subtitle?: string }) {
  return (
    <div style={{ padding: 16, paddingBottom: 12 }}>
      <div style={{ fontSize: 12, color: MUTED }}>{props.subtitle ?? ""}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color: INK, marginTop: 2 }}>
        {props.title}
      </div>
    </div>
  );
}

function SectionTitle(props: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        letterSpacing: 0.28,
        textTransform: "uppercase",
        color: MUTED,
      }}
    >
      {props.children}
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: BORDER }} />;
}

function MiniPill(props: { label: string; active?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      style={{
        borderRadius: 999,
        border: `1px solid ${BORDER}`,
        background: props.active ? "rgba(251,113,133,0.14)" : SURFACE_2,
        color: props.active ? INK : "rgba(15,23,42,0.76)",
        padding: "6px 10px",
        fontSize: 12,
        cursor: "pointer",
      }}
    >
      {props.label}
    </button>
  );
}

function InfoRow(props: { k: string; v: any }) {
  return (
    <div style={{ display: "flex", gap: 10, fontSize: 12, lineHeight: 1.35 }}>
      <div style={{ minWidth: 110, color: MUTED }}>{props.k}</div>
      <div style={{ color: INK }}>{String(props.v ?? "—")}</div>
    </div>
  );
}

function Card(props: { children: React.ReactNode }) {
  return (
    <div
      style={{
        borderRadius: 18,
        border: `1px solid ${BORDER}`,
        background: "rgba(255,255,255,0.75)",
        boxShadow: "0 10px 24px rgba(0,0,0,0.06)",
        padding: 12,
      }}
    >
      {props.children}
    </div>
  );
}

export default function DesktopPlacePanel(props: {
  // context
  title: string;
  subtitle?: string;

  // search
  query: string;
  onQueryChange: (v: string) => void;
  bedResults: BedResult[];
  cropResults: CropResult[];
  onPickBed: (bedId: string) => void;
  onPickCrop: (bedId: string, plantingId: string) => void;

  // selection
  selectedKind: "none" | "bed" | "tree" | "structure";
  selectedLabel: string | null;

  // ingredients
  plantings: Planting[];
  selectedPlantingId: string | null;
  onSelectPlanting: (id: string) => void;

  // ✅ new: selected planting detail mode (mobile parity)
  selectedPlanting?: Planting | null;
  onBackFromPlanting?: () => void;

  // tree meta
  treeMeta?: any;

  onClearSelection: () => void;

  // ✅ new: footer (smart placement)
  footer?: React.ReactNode;
}) {
  const [mode, setMode] = useState<Mode>("collapsed");

  // Auto-open like Apple Maps:
  // - selecting a bed or tree opens details
  useEffect(() => {
    if (props.selectedKind === "bed" || props.selectedKind === "tree") {
      if (mode === "collapsed") setMode("details");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.selectedKind]);

  // If query typed, open search panel
  useEffect(() => {
    if (props.query.trim().length > 0) setMode("search");
  }, [props.query]);

  const expanded = mode !== "collapsed";
  const width = expanded ? 420 : 64;

  const hasQuery = props.query.trim().length > 0;
  const hasResults = props.bedResults.length > 0 || props.cropResults.length > 0;

  const treeVariant =
    props.treeMeta?.tree?.variant ??
    props.treeMeta?.tree_variant ??
    props.treeMeta?.variant ??
    "—";

  const treeSpecies = props.treeMeta?.tree?.species ?? "—";
  const treeCultivar = props.treeMeta?.tree?.cultivar ?? "—";
  const treePlanted = props.treeMeta?.tree?.planted_at ?? "—";
  const treeNotes = props.treeMeta?.tree?.notes ?? "";

  const ingredientCount = useMemo(() => {
    const n = props.plantings.length;
    return n === 1 ? "1 ingredient" : `${n} ingredients`;
  }, [props.plantings.length]);

  // Keyboard: Esc clears search and closes detail
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (props.selectedPlanting && props.onBackFromPlanting) {
          props.onBackFromPlanting();
          return;
        }
        if (mode === "search" && props.query) {
          props.onQueryChange("");
          return;
        }
      }

      // Cmd/Ctrl + K to open search (nice modern touch)
      const isMac = navigator.platform.toLowerCase().includes("mac");
      const mod = isMac ? e.metaKey : e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setMode("search");
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, props]);

  return (
    <aside
      style={{
        position: "fixed",
        left: 14,
        top: 14,
        bottom: 14,
        width,
        zIndex: 90,
        borderRadius: 22,
        border: `1px solid ${BORDER}`,
        background: SURFACE,
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        boxShadow: SHADOW,
        overflow: "hidden",
        transition: "width 220ms ease",
        display: "flex",
      }}
    >
      {/* LEFT RAIL */}
      <div
        style={{
          width: 64,
          borderRight: `1px solid ${BORDER}`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: 10,
          gap: 10,
        }}
      >
        <Btn
          title={expanded ? "Collapse" : "Expand"}
          onClick={() => setMode(expanded ? "collapsed" : "search")}
        >
          <Icon>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z"
                stroke={INK}
                strokeWidth="1.6"
              />
            </svg>
          </Icon>
        </Btn>

        <Btn title="Search" active={mode === "search"} onClick={() => setMode("search")}>
          <Icon>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="6.5" stroke={INK} strokeWidth="1.6" />
              <path d="M20 20l-3.8-3.8" stroke={INK} strokeWidth="1.6" />
            </svg>
          </Icon>
        </Btn>

        <Btn title="Details" active={mode === "details"} onClick={() => setMode("details")}>
          <Icon>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 7h12M6 12h12M6 17h8"
                stroke={INK}
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </Icon>
        </Btn>

        <div style={{ flex: 1 }} />

        <Btn title="Clear selection" onClick={props.onClearSelection}>
          <Icon>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M6 6l12 12M18 6 6 18" stroke={INK} strokeWidth="1.6" />
            </svg>
          </Icon>
        </Btn>
      </div>

      {/* EXPANDED PANEL */}
      {expanded ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {/* Header */}
          {props.selectedPlanting ? (
            <div style={{ padding: 16, paddingBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => props.onBackFromPlanting?.()}
                  style={{
                    borderRadius: 14,
                    border: `1px solid ${BORDER}`,
                    background: SURFACE_2,
                    width: 40,
                    height: 40,
                    display: "grid",
                    placeItems: "center",
                    cursor: "pointer",
                  }}
                  aria-label="Back"
                  title="Back"
                >
                  ←
                </button>

                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 900, color: INK }}>
                    {props.selectedPlanting.crop ?? "Ingredient"}
                  </div>
                  <div style={{ fontSize: 12, color: MUTED, marginTop: 3 }}>
                    {props.selectedPlanting.status ?? "—"}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <HeaderBlock title={props.title} subtitle={props.subtitle} />
          )}

          <Divider />

          {/* Content */}
          <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
            {/* Smart footer container: footer sits at bottom if short, appears at end if scrollable */}
            <div style={{ minHeight: "100%", display: "flex", flexDirection: "column" }}>
              {props.selectedPlanting ? (
                <>
                  <Card>
                    <SectionTitle>Story</SectionTitle>
                    <div style={{ marginTop: 10, fontSize: 13, color: "rgba(15,23,42,0.74)", lineHeight: 1.45 }}>
                      {props.selectedPlanting.guest_story || "No guest story yet."}
                    </div>
                  </Card>

                  <div style={{ height: 12 }} />

                  <Card>
                    <SectionTitle>Notes</SectionTitle>
                    <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                      <InfoRow k="Kitchen" v={props.selectedPlanting.kitchen_notes ?? "—"} />
                      <InfoRow k="Gardener" v={props.selectedPlanting.gardener_notes ?? "—"} />
                    </div>
                  </Card>
                </>
              ) : mode === "search" ? (
                <div>
                  {/* Use the same modern SearchBar component */}
                  <SearchBar
                    value={props.query}
                    onChange={(v) => props.onQueryChange(v)}
                    placeholder="Search beds or crops…"
                  />

                  {hasQuery ? (
                    <div
                      style={{
                        marginTop: 14,
                        borderRadius: 18,
                        border: `1px solid ${BORDER}`,
                        background: "rgba(255,255,255,0.65)",
                        overflow: "hidden",
                      }}
                    >
                      {!hasResults ? (
                        <div style={{ padding: 12, fontSize: 12, color: MUTED }}>
                          No results.
                        </div>
                      ) : (
                        <div style={{ maxHeight: 360, overflowY: "auto" }}>
                          {props.bedResults.length > 0 ? (
                            <div style={{ padding: 12 }}>
                              <SectionTitle>Beds</SectionTitle>
                              <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                                {props.bedResults.map((b) => (
                                  <button
                                    key={b.id}
                                    type="button"
                                    onClick={() => props.onPickBed(b.id)}
                                    style={{
                                      textAlign: "left",
                                      border: `1px solid ${BORDER}`,
                                      background: "rgba(255,255,255,0.85)",
                                      color: INK,
                                      borderRadius: 16,
                                      padding: 12,
                                      cursor: "pointer",
                                    }}
                                  >
                                    <div style={{ fontSize: 13, fontWeight: 800 }}>
                                      {b.label}
                                    </div>
                                    <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>
                                      Focus bed
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          ) : null}

                          {props.cropResults.length > 0 ? (
                            <div style={{ padding: 12, borderTop: `1px solid ${BORDER}` }}>
                              <SectionTitle>Ingredients</SectionTitle>
                              <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                                {props.cropResults.map((r) => (
                                  <button
                                    key={r.plantingId}
                                    type="button"
                                    onClick={() => props.onPickCrop(r.bedId, r.plantingId)}
                                    style={{
                                      textAlign: "left",
                                      border: `1px solid ${BORDER}`,
                                      background: "rgba(255,255,255,0.85)",
                                      color: INK,
                                      borderRadius: 16,
                                      padding: 12,
                                      cursor: "pointer",
                                    }}
                                  >
                                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                                      <div style={{ fontSize: 13, fontWeight: 850 }}>{r.crop}</div>
                                      {r.subtitle ? (
                                        <div style={{ fontSize: 11, color: MUTED }}>{r.subtitle}</div>
                                      ) : null}
                                    </div>
                                    <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>
                                      {r.bedLabel}
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ marginTop: 12, fontSize: 12, color: MUTED }}>
                      Tip: try “tomato”, “citrus”, “bed”. (Cmd/Ctrl + K)
                    </div>
                  )}
                </div>
              ) : (
                // DETAILS MODE (auto-opens on selection)
                <div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                    <MiniPill
                      label="Map"
                      active={props.selectedKind === "none"}
                      onClick={props.onClearSelection}
                    />
                    <MiniPill
                      label="Ingredients"
                      active={props.selectedKind === "bed"}
                      onClick={() => {}}
                    />
                    <MiniPill
                      label="Trees"
                      active={props.selectedKind === "tree"}
                      onClick={() => {}}
                    />
                  </div>

                  {props.selectedKind === "none" ? (
                    <div style={{ fontSize: 13, color: MUTED }}>
                      Click a bed or tree to view details.
                    </div>
                  ) : props.selectedKind === "tree" ? (
                    <>
                      <SectionTitle>Selected tree</SectionTitle>
                      <div style={{ fontSize: 18, fontWeight: 850, color: INK, marginTop: 8 }}>
                        {props.selectedLabel ?? "Tree"}
                      </div>

                      <div style={{ display: "grid", gap: 8, marginTop: 14 }}>
                        <InfoRow k="Variant" v={treeVariant} />
                        <InfoRow k="Species" v={treeSpecies} />
                        <InfoRow k="Cultivar" v={treeCultivar} />
                        <InfoRow k="Planted" v={treePlanted} />
                      </div>

                      {treeNotes ? (
                        <div
                          style={{
                            marginTop: 14,
                            padding: 12,
                            borderRadius: 18,
                            border: `1px solid ${BORDER}`,
                            background: "rgba(255,255,255,0.75)",
                            color: INK,
                            fontSize: 12,
                            lineHeight: 1.45,
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {String(treeNotes)}
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <SectionTitle>Selected bed</SectionTitle>
                      <div style={{ fontSize: 18, fontWeight: 850, color: INK, marginTop: 8 }}>
                        {props.selectedLabel ?? "Bed"}
                      </div>

                      <div style={{ fontSize: 12, color: MUTED, marginTop: 6 }}>
                        {ingredientCount}
                      </div>

                      <div style={{ marginTop: 14 }}>
                        {props.plantings.length === 0 ? (
                          <div style={{ fontSize: 12, color: MUTED }}>
                            No plantings for this bed.
                          </div>
                        ) : (
                          <div style={{ display: "grid", gap: 10 }}>
                            {props.plantings.map((p) => {
                              const active = p.id === props.selectedPlantingId;
                              return (
                                <button
                                  key={p.id}
                                  onClick={() => props.onSelectPlanting(p.id)}
                                  style={{
                                    textAlign: "left",
                                    border: `1px solid ${BORDER}`,
                                    background: active ? "rgba(251,113,133,0.14)" : "rgba(255,255,255,0.75)",
                                    color: INK,
                                    borderRadius: 18,
                                    padding: 12,
                                    cursor: "pointer",
                                  }}
                                >
                                  <div style={{ fontSize: 13, fontWeight: 850 }}>
                                    {p.crop ?? "Unknown crop"}
                                  </div>
                                  <div style={{ fontSize: 12, color: MUTED, marginTop: 3 }}>
                                    {p.status ?? "—"}
                                  </div>

                                  {p.guest_story ? (
                                    <div style={{ fontSize: 12, color: MUTED, marginTop: 8 }}>
                                      {p.guest_story}
                                    </div>
                                  ) : null}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              {props.footer ? (
                <div style={{ marginTop: "auto", paddingTop: 18 }}>{props.footer}</div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
