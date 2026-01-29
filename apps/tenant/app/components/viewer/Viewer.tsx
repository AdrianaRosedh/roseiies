// apps/tenant/app/components/viewer/Viewer.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { Item, Role } from "./types";
import { useResizeObserver } from "./hooks/useResizeObserver";
import { useMapViewport } from "./hooks/useMapViewport";
import { useMediaQuery } from "./hooks/useMediaQuery";

import GardenMap from "./components/GardenMap";
import SearchBar from "./components/SearchBar";
import SearchResultsPopover, {
  type BedResult,
  type CropResult,
} from "./components/SearchResultsPopover";
import DesktopPlacePanel from "./components/DesktopPlacePanel";
import BottomSheet from "./components/BottomSheet";
import PlantCardsRow from "./components/PlantCardsRow";

import type { MapFeature } from "@/lib/features/types";

const SOIL = "#e6e2dc";

function matchesText(s: any, q: string) {
  const qq = q.trim().toLowerCase();
  if (!qq) return true;
  return String(s ?? "").toLowerCase().includes(qq);
}

function isBed(it: Item) {
  return String(it?.type ?? "").toLowerCase() === "bed";
}
function isTree(it: Item) {
  return String(it?.type ?? "").toLowerCase() === "tree";
}

function assetDbId(item: any): string {
  return String(item?.meta?.db_id ?? item?.meta?.bed_id ?? "");
}

function isPlantingFeature(f: MapFeature) {
  return String(f.kind ?? "").toLowerCase() === "planting";
}

function featureMatchesQuery(f: MapFeature, q: string) {
  const qq = q.trim().toLowerCase();
  if (!qq) return true;

  const title = String(f.title ?? "").toLowerCase();
  const subtitle = String(f.subtitle ?? "").toLowerCase();

  const guest = String(f.meta?.guest_story ?? "").toLowerCase();
  const garden = String(f.meta?.gardener_notes ?? "").toLowerCase();
  const kitchen = String(f.meta?.kitchen_notes ?? "").toLowerCase();

  return (
    title.includes(qq) ||
    subtitle.includes(qq) ||
    guest.includes(qq) ||
    garden.includes(qq) ||
    kitchen.includes(qq)
  );
}

function featureToPlantingCard(f: MapFeature) {
  return {
    id: String(f.id),
    crop: f.title ?? "Unknown",
    status: f.subtitle ?? null,
    guest_story: f.meta?.guest_story ?? null,
    gardener_notes: f.meta?.gardener_notes ?? null,
    kitchen_notes: f.meta?.kitchen_notes ?? null,
  };
}

function MobileRoseiiesFooter() {
  const ink = "rgba(15,23,42,0.82)";
  const muted = "rgba(15,23,42,0.52)";
  const border = "rgba(15,23,42,0.12)";

  return (
    <div
      style={{
        borderRadius: 18,
        border: `1px solid ${border}`,
        background: "rgba(255,255,255,0.70)",
        padding: 14,
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 12, color: muted }}>Powered by</div>
      <div style={{ fontSize: 14, fontWeight: 900, color: ink, marginTop: 2 }}>
        Roseiies
      </div>
      <div style={{ fontSize: 12, color: muted, marginTop: 10 }}>
        Privacy · Terms · Legal
      </div>
      <div style={{ fontSize: 11, color: "rgba(15,23,42,0.42)", marginTop: 10 }}>
        © {new Date().getFullYear()} Roseiies. All rights reserved.
      </div>
    </div>
  );
}

export default function Viewer(props: {
  canvas: { width: number; height: number };
  items: Item[];
  features: MapFeature[];
  role?: Role;
  title?: string;
  subtitle?: string;
}) {
  const isDesktop = useMediaQuery("(min-width: 900px)");
  const _role = props.role ?? "guest";

  const { ref: measureRef, size } = useResizeObserver<HTMLDivElement>();

  const items = useMemo(
    () =>
      [...(props.items ?? [])].sort(
        (a, b) => (a.order ?? 0) - (b.order ?? 0)
      ),
    [props.items]
  );

  const beds = useMemo(() => items.filter(isBed), [items]);

  // DB asset id -> canvas bed id
  const dbAssetToCanvasBed = useMemo(() => {
    const m = new Map<string, string>();
    for (const b of beds) {
      const db = assetDbId(b);
      if (db) m.set(db, b.id);
    }
    return m;
  }, [beds]);

  // canvas bed id -> features
  const featuresByBed = useMemo(() => {
    const m = new Map<string, MapFeature[]>();
    for (const f of props.features ?? []) {
      const canvasBedId = dbAssetToCanvasBed.get(String(f.asset_id));
      if (!canvasBedId) continue;
      const arr = m.get(canvasBedId) ?? [];
      arr.push(f);
      m.set(canvasBedId, arr);
    }
    return m;
  }, [props.features, dbAssetToCanvasBed]);

  const viewport = useMapViewport({
    viewportWidth: size.width,
    viewportHeight: size.height,
    contentWidth: props.canvas.width,
    contentHeight: props.canvas.height,
    padding: isDesktop ? 72 : 120,
  });

  const didFitRef = useRef(false);
  useEffect(() => {
    if (didFitRef.current) return;
    if (size.width <= 0 || size.height <= 0) return;
    didFitRef.current = true;
    viewport.fitToContent();
  }, [size.width, size.height, viewport]);

  // Selection
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);

  const selectedItem = useMemo(() => {
    if (!selectedItemId) return null;
    return items.find((it) => it.id === selectedItemId) ?? null;
  }, [items, selectedItemId]);

  const selectedItemIsTree = Boolean(selectedItem && isTree(selectedItem));
  const selectedItemIsBed = Boolean(selectedItem && isBed(selectedItem));

  const selectedItemFeatures = useMemo(() => {
    if (!selectedItemId) return [];
    return featuresByBed.get(selectedItemId) ?? [];
  }, [featuresByBed, selectedItemId]);

  const selectedPlantingCards = useMemo(() => {
    if (!selectedItemIsBed) return [];
    return selectedItemFeatures
      .filter(isPlantingFeature)
      .map(featureToPlantingCard);
  }, [selectedItemFeatures, selectedItemIsBed]);

  const selectedPlantingCard = useMemo(() => {
    if (!selectedFeatureId) return null;
    const f = selectedItemFeatures.find(
      (x) => String(x.id) === selectedFeatureId
    );
    if (!f || !isPlantingFeature(f)) return null;
    return featureToPlantingCard(f);
  }, [selectedItemFeatures, selectedFeatureId]);

  // ✅ DesktopPlacePanel expects this
  const selectedPlanting = selectedPlantingCard;

  // Search
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  const bedResults: BedResult[] = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    return beds
      .filter((b) => matchesText(b.label, q))
      .slice(0, 8)
      .map((b) => ({ id: b.id, label: b.label }));
  }, [beds, query]);

  const cropResults: CropResult[] = useMemo(() => {
    const q = query.trim();
    if (!q) return [];

    const out: CropResult[] = [];
    for (const f of props.features ?? []) {
      if (!isPlantingFeature(f)) continue;
      if (!featureMatchesQuery(f, q)) continue;

      const canvasBedId = dbAssetToCanvasBed.get(String(f.asset_id));
      if (!canvasBedId) continue;

      const bed = beds.find((b) => b.id === canvasBedId);

      out.push({
        plantingId: String(f.id),
        crop: f.title ?? "Unknown",
        bedId: canvasBedId,
        bedLabel: bed?.label ?? "Bed",
        subtitle: f.subtitle ?? undefined,
      });
    }

    const seen = new Set<string>();
    return out
      .filter((r) =>
        seen.has(r.plantingId) ? false : (seen.add(r.plantingId), true)
      )
      .slice(0, 10);
  }, [props.features, query, dbAssetToCanvasBed, beds]);

  // Bottom sheet
  const [sheetSnap, setSheetSnap] = useState<"collapsed" | "medium" | "large">(
    "collapsed"
  );

  const clearSelection = () => {
    setSelectedItemId(null);
    setSelectedFeatureId(null);
    setSheetSnap("collapsed");
  };

  const selectItem = (id: string) => {
    setSelectedItemId(id);
    setSelectedFeatureId(null);
    if (!isDesktop) setSheetSnap("medium");
  };

  const selectFeature = (bedId: string, featureId: string) => {
    setSelectedItemId(bedId);
    setSelectedFeatureId(featureId);
    if (!isDesktop) setSheetSnap("large");
  };

  const ready = size.width > 0 && size.height > 0;

  // Mobile modes
  const isSearchingMobile = !isDesktop && (searchOpen || query.trim().length > 0);
  const selectedVegMobile = !isDesktop ? selectedPlantingCard : null;

  useEffect(() => {
    if (isDesktop) return;
    if (isSearchingMobile || selectedVegMobile) setSheetSnap("large");
  }, [isDesktop, isSearchingMobile, selectedVegMobile]);

  const headerIconBtn: React.CSSProperties = {
    border: "1px solid rgba(15,23,42,0.12)",
    background: "rgba(15,23,42,0.06)",
    color: "rgba(15,23,42,0.62)",
    borderRadius: 16,
    width: 44,
    height: 44,
    display: "grid",
    placeItems: "center",
    cursor: "pointer",
    flex: "0 0 auto",
  };

  return (
    <div
      ref={measureRef}
      className="relative overflow-hidden"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        overscrollBehavior: "none",
        touchAction: "none",
        background: SOIL,
      }}
    >
      {!ready ? (
        <div className="absolute inset-0 grid place-items-center">
          <div style={{ fontSize: 13, color: "rgba(0,0,0,0.55)" }}>
            Loading…
          </div>
        </div>
      ) : (
        <>
          <GardenMap
            stageRefSetter={viewport.setStageRef}
            viewport={{ width: size.width, height: size.height }}
            vp={viewport.vp}
            canvas={props.canvas}
            items={items}
            featuresByBed={featuresByBed}
            selectedBedId={selectedItemId}
            onSelectBed={selectItem}
            onSelectFeature={selectFeature}
            onTapBackground={clearSelection}
            onWheel={viewport.onWheel}
            onDragEnd={(pos) =>
              viewport.setVp((p) => ({ ...p, x: pos.x, y: pos.y }))
            }
          />

          {/* ✅ Desktop dock-left (your collapsible desktop UI) */}
          {isDesktop ? (
            <DesktopPlacePanel
              title={props.title ?? "Olivea"}
              subtitle={props.subtitle ?? "Garden"}
              query={query}
              onQueryChange={setQuery}
              bedResults={bedResults}
              cropResults={cropResults}
              onPickBed={(bedId) => {
                selectItem(bedId);
                setQuery(""); // optional: clear after selection
              }}
              onPickCrop={(bedId, plantingId) => {
                selectFeature(bedId, plantingId); // opens veggie detail mode in desktop panel
                setQuery(""); // optional: clear after selection
              }}
              selectedKind={
                !selectedItem
                  ? "none"
                  : selectedItemIsTree
                  ? "tree"
                  : selectedItemIsBed
                  ? "bed"
                  : "none"
              }
              selectedLabel={selectedItem ? selectedItem.label : null}
              plantings={selectedPlantingCards as any}
              selectedPlantingId={selectedPlantingCard?.id ?? null}
              onSelectPlanting={(id) => setSelectedFeatureId(id)}
              treeMeta={selectedItem?.meta}
              onClearSelection={clearSelection}
              // ✅ if you applied my updated DesktopPlacePanel that supports footer + planting detail:
              selectedPlanting={selectedPlantingCard}
              onBackFromPlanting={() => setSelectedFeatureId(null)}
              footer={<MobileRoseiiesFooter />}
            />
          ) : null}     

          {/* ✅ Mobile BottomSheet (already modern) */}
          {!isDesktop ? (
            <BottomSheet
              open={true}
              snap={sheetSnap}
              onSnapChange={setSheetSnap}
              footer={<MobileRoseiiesFooter />}
              header={
                isSearchingMobile ? (
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <SearchBar
                        variant="header"
                        value={query}
                        onChange={(v) => {
                          setQuery(v);
                          setSearchOpen(true);
                          setSheetSnap("large");
                        }}
                        onFocus={() => {
                          setSearchOpen(true);
                          setSheetSnap("large");
                        }}
                        placeholder="Search beds or crops…"
                        onKeyDown={(e) => {
                          if (e.key === "Escape") {
                            setSearchOpen(false);
                            setQuery("");
                          }
                        }}
                      />
                    </div>

                    <button
                      type="button"
                      aria-label="Close search"
                      onClick={() => {
                        setQuery("");
                        setSearchOpen(false);
                        setSheetSnap(selectedItem ? "medium" : "collapsed");
                      }}
                      style={headerIconBtn}
                    >
                      ✕
                    </button>
                  </div>
                ) : selectedVegMobile ? (
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <button
                      type="button"
                      aria-label="Back"
                      onClick={() => {
                        setSelectedFeatureId(null);
                        setSheetSnap("medium");
                      }}
                      style={headerIconBtn}
                    >
                      ←
                    </button>

                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 16,
                          fontWeight: 950,
                          color: "rgba(15,23,42,0.92)",
                        }}
                      >
                        {selectedVegMobile.crop ?? "Ingredient"}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "rgba(15,23,42,0.58)",
                          marginTop: 3,
                        }}
                      >
                        {selectedVegMobile.status ?? "—"}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 950,
                        color: "rgba(15,23,42,0.92)",
                      }}
                    >
                      {props.title ?? "Olivea"}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: "rgba(15,23,42,0.58)",
                        marginTop: 3,
                      }}
                    >
                      {props.subtitle ?? "Garden"}
                    </div>
                  </div>
                )
              }
            >
              {isSearchingMobile ? (
                <SearchResultsPopover
                  open={true}
                  query={query}
                  bedResults={bedResults}
                  cropResults={cropResults}
                  onPickBed={(bedId) => {
                    selectItem(bedId);
                    setSearchOpen(false);
                    setQuery("");
                    setSheetSnap("medium");
                  }}
                  onPickCrop={(bedId, plantingId) => {
                    selectFeature(bedId, plantingId);
                    setSearchOpen(false);
                    setQuery("");
                    setSheetSnap("large");
                  }}
                  onClose={() => {
                    setSearchOpen(false);
                    setQuery("");
                    setSheetSnap(selectedItem ? "medium" : "collapsed");
                  }}
                />
              ) : selectedVegMobile ? (
                <div
                  style={{
                    borderRadius: 18,
                    border: "1px solid rgba(15,23,42,0.12)",
                    background: "rgba(255,255,255,0.70)",
                    padding: 14,
                    boxShadow: "0 10px 24px rgba(0,0,0,0.06)",
                  }}
                >
                  {selectedVegMobile.guest_story ? (
                    <div
                      style={{
                        fontSize: 13,
                        color: "rgba(15,23,42,0.72)",
                        lineHeight: 1.45,
                      }}
                    >
                      {selectedVegMobile.guest_story}
                    </div>
                  ) : (
                    <div style={{ fontSize: 13, color: "rgba(15,23,42,0.55)" }}>
                      No guest story yet.
                    </div>
                  )}
                </div>
              ) : !selectedItem ? (
                <>
                  <SearchBar
                    value={query}
                    onChange={(v) => {
                      setQuery(v);
                      setSearchOpen(true);
                      setSheetSnap("large");
                    }}
                    onFocus={() => {
                      setSearchOpen(true);
                      setSheetSnap("large");
                    }}
                    placeholder="Search beds or crops…"
                  />
                  <div
                    style={{
                      marginTop: 16,
                      fontSize: 12,
                      color: "rgba(15,23,42,0.55)",
                    }}
                  >
                    Tap a bed or tree to see details.
                  </div>
                </>
              ) : selectedItemIsTree ? (
                <div
                  style={{
                    borderRadius: 18,
                    border: "1px solid rgba(15,23,42,0.12)",
                    background: "rgba(255,255,255,0.70)",
                    padding: 14,
                    boxShadow: "0 10px 24px rgba(0,0,0,0.06)",
                  }}
                >
                  <div style={{ fontSize: 16, fontWeight: 950, color: "rgba(15,23,42,0.92)" }}>
                    {selectedItem.label ?? "Tree"}
                  </div>
                  <div style={{ marginTop: 8, fontSize: 12, color: "rgba(15,23,42,0.58)" }}>
                    Variant: {(selectedItem as any)?.meta?.tree?.variant ?? "—"}
                  </div>
                </div>
              ) : (
                <PlantCardsRow
                  plantings={selectedPlantingCards as any}
                  selectedPlantingId={selectedPlantingCard?.id ?? null}
                  onSelectPlanting={(id) => {
                    setSelectedFeatureId(id);
                    setSheetSnap("large");
                  }}
                />
              )}
            </BottomSheet>
          ) : null}
        </>
      )}
    </div>
  );
}
