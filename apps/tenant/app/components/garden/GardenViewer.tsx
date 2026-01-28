// apps/tenant/app/components/garden/GardenViewer.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { GardenPlanting } from "@/lib/garden/load-plantings";

import type { Item, Role } from "./viewer/types";
import { buildPlantingsByBed, findBed, getBeds } from "./viewer/utils";

import { useResizeObserver } from "./viewer/hooks/useResizeObserver";
import { useMapViewport } from "./viewer/hooks/useMapViewport";
import { useMediaQuery } from "./viewer/hooks/useMediaQuery";

import GardenMap from "./viewer/components/GardenMap";
import BottomSheet from "./viewer/components/BottomSheet";
import PlantCardsRow from "./viewer/components/PlantCardsRow";
import DesktopPlacePanel from "./viewer/components/DesktopPlacePanel";
import FloatingControls from "./viewer/components/FloatingControls";
import SearchBar from "./viewer/components/SearchBar";
import SearchResultsPopover, {
  type BedResult,
  type CropResult,
} from "./viewer/components/SearchResultsPopover";

function matchesQueryText(s: string | null | undefined, q: string) {
  const qq = q.trim().toLowerCase();
  if (!qq) return true;
  return String(s ?? "").toLowerCase().includes(qq);
}

function matchesPlanting(p: GardenPlanting, q: string) {
  const qq = q.trim().toLowerCase();
  if (!qq) return true;
  return (
    (p.crop ?? "").toLowerCase().includes(qq) ||
    (p.status ?? "").toLowerCase().includes(qq) ||
    (p.guest_story ?? "").toLowerCase().includes(qq) ||
    (p.gardener_notes ?? "").toLowerCase().includes(qq) ||
    (p.kitchen_notes ?? "").toLowerCase().includes(qq)
  );
}

/**
 * IMPORTANT:
 * Canvas beds often have their own id (item.id).
 * Plantings are keyed by DB planting.bed_id.
 * If your bed items include DB bed id somewhere, we should use it.
 */
function bedKey(bed: any): string {
  return (
    bed?.bed_id ??
    bed?.meta?.bed_id ??
    bed?.data?.bed_id ??
    bed?.db_id ??
    bed?.meta?.db_id ??
    bed?.id // fallback (canvas id)
  );
}

export default function GardenViewer(props: {
  canvas: { width: number; height: number };
  items: Item[];
  plantings: GardenPlanting[];
  role?: Role;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDesktop = useMediaQuery("(min-width: 900px)");
  const role = props.role ?? "guest";

  const { ref: measureRef, size } = useResizeObserver<HTMLDivElement>();

  const beds = useMemo(() => getBeds(props.items), [props.items]);

  // ✅ Build DB-bed-id -> canvas-bed-id mapping (and lookup by DB id)
  const bedDbToCanvasId = useMemo(() => {
    const m = new Map<string, string>();
    for (const b of beds) {
      const k = bedKey(b);
      if (k) m.set(String(k), b.id);
    }
    return m;
  }, [beds]);

  const bedByDbId = useMemo(() => {
    const m = new Map<string, any>();
    for (const b of beds) {
      const k = bedKey(b);
      if (k) m.set(k, b);
    }
    return m;
  }, [beds]);

  const plantingsByBed = useMemo(
    () => buildPlantingsByBed(props.plantings),
    [props.plantings]
  );

  const [selectedBedId, setSelectedBedId] = useState<string | null>(null);
  const [selectedPlantingId, setSelectedPlantingId] = useState<string | null>(
    null
  );

  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement | null>(null);

  const selectedBed = useMemo(
    () => findBed(beds, selectedBedId),
    [beds, selectedBedId]
  );

  const selectedBedPlantingsAll = useMemo(() => {
    if (!selectedBed) return [];
    const key = bedKey(selectedBed);
    return plantingsByBed.get(key) ?? [];
  }, [plantingsByBed, selectedBed]);

  const selectedBedPlantings = useMemo(() => {
    return selectedBedPlantingsAll.filter((p) => matchesPlanting(p, query));
  }, [selectedBedPlantingsAll, query]);

  const selectedPlanting = useMemo(() => {
    if (selectedPlantingId) {
      return props.plantings.find((p) => p.id === selectedPlantingId) ?? null;
    }
    if (selectedBedId) return selectedBedPlantings[0] ?? null;
    return null;
  }, [props.plantings, selectedPlantingId, selectedBedId, selectedBedPlantings]);

  const fitPadding = isDesktop ? 72 : 140;

  const viewport = useMapViewport({
    viewportWidth: size.width,
    viewportHeight: size.height,
    contentWidth: props.canvas.width,
    contentHeight: props.canvas.height,
    padding: fitPadding,
  });

  const didFitRef = useRef(false);
  useEffect(() => {
    if (!mounted) return;
    if (didFitRef.current) return;
    if (size.width <= 0 || size.height <= 0) return;
    didFitRef.current = true;
    viewport.fitToContent();
  }, [mounted, size.width, size.height, viewport]);

  const [sheetSnap, setSheetSnap] = useState<"collapsed" | "medium" | "large">(
    "collapsed"
  );
  const openToMedium = () => setSheetSnap("medium");
  const openToLarge = () => setSheetSnap("large");

  const clearSelection = () => {
    setSelectedBedId(null);
    setSelectedPlantingId(null);
    setSheetSnap("collapsed");
  };

  const selectBed = (bedId: string) => {
    setSelectedBedId(bedId);
    setSelectedPlantingId(null);

    const bed = beds.find((b) => b.id === bedId);
    if (bed && "panToBed" in viewport) (viewport as any).panToBed(bed);

    if (!isDesktop) openToMedium();
  };

  const selectPin = (bedId: string, plantingId: string) => {
    setSelectedBedId(bedId);
    setSelectedPlantingId(plantingId);

    const bed = beds.find((b) => b.id === bedId);
    if (bed && "panToBed" in viewport) (viewport as any).panToBed(bed);

    if (!isDesktop) openToLarge();
  };

  const bedResults: BedResult[] = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    return beds
      .filter((b) => matchesQueryText(b.label, q))
      .slice(0, 8)
      .map((b) => ({ id: b.id, label: b.label }));
  }, [beds, query]);

  // ✅ FIX: cropResults should map planting.bed_id (DB) -> bed canvas id
  const cropResults: CropResult[] = useMemo(() => {
    const q = query.trim();
    if (!q) return [];

    const out: CropResult[] = [];

    for (const p of props.plantings) {
      if (!matchesPlanting(p, q)) continue;

      const dbBedId = p.bed_id ? String(p.bed_id) : null;
      const bed = dbBedId ? bedByDbId.get(dbBedId) : null;
      const canvasBedId = dbBedId ? bedDbToCanvasId.get(dbBedId) : null;

      out.push({
        plantingId: p.id,
        crop: p.crop ?? "Unknown",
        bedId: canvasBedId ?? bed?.id ?? (dbBedId ?? "unknown-bed"),
        bedLabel: bed?.label ?? "Bed",
        subtitle: p.status ?? undefined,
      });
    }

    const seen = new Set<string>();
    return out
      .filter((r) => (seen.has(r.plantingId) ? false : (seen.add(r.plantingId), true)))
      .slice(0, 10);
  }, [props.plantings, query, bedByDbId, bedDbToCanvasId]);

  useEffect(() => {
    if (!mounted) return;
    function onDown(e: MouseEvent) {
      const el = searchBoxRef.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) setSearchOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [mounted]);

  const ready = mounted && size.width > 0 && size.height > 0;

  const openDesktopPanel =
    isDesktop &&
    (Boolean(selectedBedId) ||
      Boolean(selectedPlantingId) ||
      query.trim().length > 0);

  return (
    <div
      ref={measureRef}
      className="relative h-full w-full overflow-hidden"
      style={{ overscrollBehavior: "none" }}
    >
      {!ready ? (
        <div className="absolute inset-0 grid place-items-center">
          <div className="text-sm text-(--rose-muted)">Loading map…</div>
        </div>
      ) : (
        <>
          {/* Search overlay */}
          <div ref={searchBoxRef} className="pointer-events-none absolute left-4 top-4 z-90">
            <div className="pointer-events-auto">
              <SearchBar
                value={query}
                onChange={(v) => {
                  setQuery(v);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
                placeholder="Search crops, notes, beds…"
                onKeyDown={(e) => {
                  if (e.key === "Escape") setSearchOpen(false);
                  if (e.key === "Enter") {
                    if (cropResults[0]) {
                      selectPin(cropResults[0].bedId, cropResults[0].plantingId);
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
                onPickCrop={(bedId, plantingId) => selectPin(bedId, plantingId)}
                onClose={() => setSearchOpen(false)}
              />
            </div>
          </div>

          {/* Map */}
          <GardenMap
            stageRefSetter={viewport.setStageRef}
            viewport={{ width: size.width, height: size.height }}
            vp={viewport.vp}
            isPinching={viewport.isPinching}
            canvas={props.canvas}
            items={props.items}
            plantingsByBed={plantingsByBed}
            selectedBedId={selectedBedId}
            onSelectBed={selectBed}
            onSelectPin={selectPin}
            onTapBackground={clearSelection}
            onWheel={viewport.onWheel}
            onTouchStart={viewport.onTouchStart}
            onTouchMove={viewport.onTouchMove}
            onTouchEnd={viewport.onTouchEnd}
            onDragEnd={(pos) => viewport.setVp((p) => ({ ...p, x: pos.x, y: pos.y }))}
          />

          {/* Floating controls */}
          <div className="absolute inset-0 z-85 pointer-events-none">
            <div className="pointer-events-auto">
              <FloatingControls onReset={viewport.fitToContent} />
            </div>
          </div>

          {/* Desktop dock */}
          <DesktopPlacePanel
            open={openDesktopPanel}
            bedLabel={selectedBed ? selectedBed.label : null}
            role={role}
            plantings={selectedBedPlantings}
            selectedPlantingId={selectedPlanting?.id ?? null}
            onSelectPlanting={(id) => setSelectedPlantingId(id)}
          />

          {/* Mobile bottom sheet */}
          {!isDesktop ? (
            <BottomSheet
              open={true}
              snap={sheetSnap}
              onSnapChange={setSheetSnap}
              subtitle={selectedBed ? "Bed" : undefined}
              title={selectedBed ? selectedBed.label : "Garden"}
            >
              {!selectedBed ? (
                <div className="text-sm text-(--rose-muted)">
                  Pinch to zoom. Drag to pan. Tap a bed (or a pin) to open plant cards.
                </div>
              ) : selectedBedPlantings.length === 0 ? (
                <>
                  <div className="text-sm text-(--rose-muted)">
                    No plantings found for this bed.
                  </div>
                  <div className="mt-1 text-xs text-(--rose-muted)">
                    Debug bedKey: {String(bedKey(selectedBed))}
                  </div>
                </>
              ) : (
                <>
                  <div className="text-xs text-(--rose-muted)">
                    Plantings: {selectedBedPlantings.length}
                  </div>

                  <PlantCardsRow
                    plantings={selectedBedPlantings}
                    role={role}
                    selectedPlantingId={selectedPlanting?.id ?? null}
                    onSelectPlanting={(id) => {
                      setSelectedPlantingId(id);
                      setSheetSnap("large");
                    }}
                  />
                </>
              )}
            </BottomSheet>
          ) : null}
        </>
      )}
    </div>
  );
}
