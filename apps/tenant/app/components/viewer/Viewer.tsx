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

function matchesText(s: any, q: string) {
  const qq = q.trim().toLowerCase();
  if (!qq) return true;
  return String(s ?? "").toLowerCase().includes(qq);
}

function getBeds(items: Item[]) {
  return (items ?? []).filter((i) => String(i.type ?? "").toLowerCase() === "bed");
}

function assetDbId(item: any): string {
  return String(item?.meta?.db_id ?? item?.meta?.bed_id ?? "");
}

type PlantingLike = {
  id: string;
  bed_id: string; // DB asset id
  crop?: string | null;
  status?: string | null;
  guest_story?: string | null;
  gardener_notes?: string | null;
  kitchen_notes?: string | null;
};

function featureToPlantingLike(f: MapFeature): PlantingLike {
  return {
    id: String(f.id),
    bed_id: String(f.asset_id),
    crop: f.title ?? null,
    status: f.subtitle ?? null,
    guest_story: f.meta?.guest_story ?? null,
    gardener_notes: f.meta?.gardener_notes ?? null,
    kitchen_notes: f.meta?.kitchen_notes ?? null,
  };
}

function matchesPlantingLike(p: PlantingLike, q: string) {
  const qq = q.trim().toLowerCase();
  if (!qq) return true;
  return (
    String(p.crop ?? "").toLowerCase().includes(qq) ||
    String(p.status ?? "").toLowerCase().includes(qq) ||
    String(p.guest_story ?? "").toLowerCase().includes(qq) ||
    String(p.gardener_notes ?? "").toLowerCase().includes(qq) ||
    String(p.kitchen_notes ?? "").toLowerCase().includes(qq)
  );
}

function glassBoxStyle(): React.CSSProperties {
  return {
    borderColor: "rgba(255,255,255,0.10)",
    background: "rgba(12,18,32,0.55)", // deep ink glass
    backdropFilter: "blur(14px)",
    WebkitBackdropFilter: "blur(14px)",
  };
}

export default function Viewer(props: {
  canvas: { width: number; height: number };
  items: Item[];
  features: MapFeature[];
  role?: Role;
  title?: string;
  subtitle?: string;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDesktop = useMediaQuery("(min-width: 900px)");
  const role = props.role ?? "guest";

  const { ref: measureRef, size } = useResizeObserver<HTMLDivElement>();

  const items = useMemo(
    () => [...(props.items ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [props.items]
  );
  const beds = useMemo(() => getBeds(items), [items]);

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

  // plantings (adapter so your existing card UI works)
  const plantingFeatures = useMemo(() => {
    return (props.features ?? []).filter((f) => String(f.kind ?? "").toLowerCase() === "planting");
  }, [props.features]);

  const plantingsLike: PlantingLike[] = useMemo(
    () => plantingFeatures.map(featureToPlantingLike),
    [plantingFeatures]
  );

  const viewport = useMapViewport({
    viewportWidth: size.width,
    viewportHeight: size.height,
    contentWidth: props.canvas.width,
    contentHeight: props.canvas.height,
    padding: isDesktop ? 72 : 120,
  });

  const didFitRef = useRef(false);
  useEffect(() => {
    if (!mounted) return;
    if (didFitRef.current) return;
    if (size.width <= 0 || size.height <= 0) return;
    didFitRef.current = true;
    viewport.fitToContent();
  }, [mounted, size.width, size.height, viewport]);

  const [selectedBedId, setSelectedBedId] = useState<string | null>(null);
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);

  const selectedBed = useMemo(() => beds.find((b) => b.id === selectedBedId) ?? null, [
    beds,
    selectedBedId,
  ]);

  const selectedBedFeatures = useMemo(() => {
    if (!selectedBedId) return [];
    return featuresByBed.get(selectedBedId) ?? [];
  }, [featuresByBed, selectedBedId]);

  const selectedBedPlantingsLike = useMemo(() => {
    return selectedBedFeatures
      .filter((f) => String(f.kind ?? "").toLowerCase() === "planting")
      .map(featureToPlantingLike);
  }, [selectedBedFeatures]);

  const selectedPlantingLike = useMemo(() => {
    if (!selectedFeatureId) return null;
    const f = selectedBedFeatures.find((x) => x.id === selectedFeatureId) ?? null;
    if (!f) return null;
    if (String(f.kind ?? "").toLowerCase() !== "planting") return null;
    return featureToPlantingLike(f);
  }, [selectedFeatureId, selectedBedFeatures]);

  // Search
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement | null>(null);

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
    for (const p of plantingsLike) {
      if (!matchesPlantingLike(p, q)) continue;
      const canvasBedId = dbAssetToCanvasBed.get(String(p.bed_id));
      if (!canvasBedId) continue;
      const bed = beds.find((b) => b.id === canvasBedId);
      out.push({
        plantingId: p.id,
        crop: p.crop ?? "Unknown",
        bedId: canvasBedId,
        bedLabel: bed?.label ?? "Bed",
        subtitle: p.status ?? undefined,
      });
    }

    const seen = new Set<string>();
    return out.filter((r) => (seen.has(r.plantingId) ? false : (seen.add(r.plantingId), true))).slice(0, 10);
  }, [plantingsLike, query, dbAssetToCanvasBed, beds]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      const el = searchBoxRef.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) setSearchOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const [sheetSnap, setSheetSnap] = useState<"collapsed" | "medium" | "large">("collapsed");

  const clearSelection = () => {
    setSelectedBedId(null);
    setSelectedFeatureId(null);
    setSheetSnap("collapsed");
  };

  const selectBed = (bedId: string) => {
    setSelectedBedId(bedId);
    setSelectedFeatureId(null);
    if (!isDesktop) setSheetSnap("medium");
  };

  const selectFeature = (bedId: string, featureId: string) => {
    setSelectedBedId(bedId);
    setSelectedFeatureId(featureId);
    if (!isDesktop) setSheetSnap("large");
  };

  const ready = mounted && size.width > 0 && size.height > 0;

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
      }}
    >
      {/* Header */}
      <div className="pointer-events-none absolute left-4 top-4 z-90">
        <div
          className="pointer-events-auto rounded-2xl border px-3 py-2"
          style={glassBoxStyle()}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.92)" }}>
            {props.title ?? "Roseiies"}
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.60)" }}>
            {props.subtitle ?? "Interactive view"}
          </div>
        </div>
      </div>

      {/* Search */}
      <div ref={searchBoxRef} className="pointer-events-none absolute left-4 top-24 z-90">
        <div className="pointer-events-auto">
          <SearchBar
            value={query}
            onChange={(v) => {
              setQuery(v);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            placeholder="Search beds or crops…"
            onKeyDown={(e) => {
              if (e.key === "Escape") setSearchOpen(false);
              if (e.key === "Enter") {
                if (cropResults[0]) {
                  selectFeature(cropResults[0].bedId, cropResults[0].plantingId);
                  setSearchOpen(false);
                } else if (bedResults[0]) {
                  selectBed(bedResults[0].id);
                  setSearchOpen(false);
                }
              }
            }}
          />

          <SearchResultsPopover
            open={searchOpen && query.trim().length > 0}
            query={query}
            bedResults={bedResults}
            cropResults={cropResults}
            onPickBed={(bedId) => selectBed(bedId)}
            onPickCrop={(bedId, plantingId) => selectFeature(bedId, plantingId)}
            onClose={() => setSearchOpen(false)}
          />
        </div>
      </div>

      {!ready ? (
        <div className="absolute inset-0 grid place-items-center">
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.65)" }}>Loading…</div>
        </div>
      ) : (
        <>
          <GardenMap
            stageRefSetter={() => {}}
            viewport={{ width: size.width, height: size.height }}
            vp={viewport.vp}
            canvas={props.canvas}
            items={items}
            featuresByBed={featuresByBed}
            selectedBedId={selectedBedId}
            onSelectBed={selectBed}
            onSelectFeature={selectFeature}
            onTapBackground={clearSelection}
            onWheel={viewport.onWheel}
            onDragEnd={(pos) => viewport.setVp((p) => ({ ...p, x: pos.x, y: pos.y }))}
          />

          <DesktopPlacePanel
            open={isDesktop && Boolean(selectedBedId)}
            bedLabel={selectedBed ? selectedBed.label : null}
            plantings={selectedBedPlantingsLike as any}
            selectedPlantingId={selectedPlantingLike?.id ?? null}
            onSelectPlanting={(id) => setSelectedFeatureId(id)}
          />

          {!isDesktop ? (
            <BottomSheet
              open={true}
              snap={sheetSnap}
              onSnapChange={setSheetSnap}
              title={selectedBed ? selectedBed.label : "Garden"}
              subtitle={selectedBed ? `Features: ${selectedBedFeatures.length}` : "Tip"}
            >
              {!selectedBed ? (
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.70)" }}>
                  Drag to pan. Scroll/trackpad to zoom. Tap a bed or a pin to see what’s growing.
                </div>
              ) : selectedBedPlantingsLike.length > 0 ? (
                <PlantCardsRow
                  plantings={selectedBedPlantingsLike as any}
                  selectedPlantingId={selectedPlantingLike?.id ?? null}
                  onSelectPlanting={(id) => {
                    setSelectedFeatureId(id);
                    setSheetSnap("large");
                  }}
                />
              ) : (
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.70)" }}>
                  No plantings visible for this bed yet.
                </div>
              )}
            </BottomSheet>
          ) : null}
        </>
      )}
    </div>
  );
}
