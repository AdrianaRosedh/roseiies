"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { GardenPlanting } from "@/lib/garden/load-plantings";

import type { Item, Role } from "./viewer/types";
import { buildPlantingsByBed, findBed, getBeds } from "./viewer/utils";

import { useResizeObserver } from "./viewer/hooks/useResizeObserver";
import { useMapViewport } from "./viewer/hooks/useMapViewport";

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

export default function GardenViewer(props: {
  canvas: { width: number; height: number };
  items: Item[];
  plantings: GardenPlanting[];
  role?: Role;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const role = props.role ?? "guest";

  const { ref: measureRef, size } = useResizeObserver<HTMLDivElement>();

  // Desktop detection: width + pointer type
  const [vw, setVw] = useState<number>(typeof window === "undefined" ? 0 : window.innerWidth);
  const [pointerFine, setPointerFine] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onResize = () => setVw(window.innerWidth);
    window.addEventListener("resize", onResize);
    onResize();

    const mq = window.matchMedia("(pointer: fine)");
    const onPointer = () => setPointerFine(mq.matches);
    onPointer();

    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", onPointer);
      return () => {
        window.removeEventListener("resize", onResize);
        mq.removeEventListener("change", onPointer);
      };
    } else {
      mq.addListener(onPointer);
      return () => {
        window.removeEventListener("resize", onResize);
        mq.removeListener(onPointer);
      };
    }
  }, []);

  const isDesktop = vw >= 900 && pointerFine;

  const beds = useMemo(() => getBeds(props.items), [props.items]);
  const plantingsByBed = useMemo(() => buildPlantingsByBed(props.plantings), [props.plantings]);

  const [selectedBedId, setSelectedBedId] = useState<string | null>(null);
  const [selectedPlantingId, setSelectedPlantingId] = useState<string | null>(null);

  // Search
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement | null>(null);

  const selectedBed = useMemo(() => findBed(beds, selectedBedId), [beds, selectedBedId]);

  const selectedBedPlantingsAll = useMemo(() => {
    if (!selectedBedId) return [];
    return plantingsByBed.get(selectedBedId) ?? [];
  }, [plantingsByBed, selectedBedId]);

  const selectedBedPlantings = useMemo(() => {
    return selectedBedPlantingsAll.filter((p: GardenPlanting) => matchesPlanting(p, query));
  }, [selectedBedPlantingsAll, query]);

  const selectedPlanting = useMemo(() => {
    if (selectedPlantingId) {
      return props.plantings.find((p) => p.id === selectedPlantingId) ?? null;
    }
    if (selectedBedId) return selectedBedPlantings[0] ?? null;
    return null;
  }, [props.plantings, selectedPlantingId, selectedBedId, selectedBedPlantings]);

  const viewport = useMapViewport({
    viewportWidth: size.width,
    viewportHeight: size.height,
    contentWidth: props.canvas.width,
    contentHeight: props.canvas.height,
    padding: 140,
  });

  // Fit once
  const didFitRef = useRef(false);
  useEffect(() => {
    if (!mounted) return;
    if (didFitRef.current) return;
    if (size.width <= 0 || size.height <= 0) return;

    didFitRef.current = true;
    viewport.fitToContent();
  }, [mounted, size.width, size.height, viewport]);

  // Mobile sheet state (only used on mobile)
  const [sheetSnap, setSheetSnap] = useState<"collapsed" | "medium" | "large">("collapsed");
  const openToMedium = () => setSheetSnap("medium");
  const openToLarge = () => setSheetSnap("large");

  const clearSelection = () => {
    setSelectedBedId(null);
    setSelectedPlantingId(null);
    setSheetSnap("collapsed");
  };

  const selectBedById = (bedId: string) => {
    setSelectedBedId(bedId);
    setSelectedPlantingId(null);

    const bed = beds.find((b) => b.id === bedId);
    if (bed) viewport.focusBed(bed);

    if (!isDesktop) openToMedium();
  };

  const selectPlantingById = (bedId: string, plantingId: string) => {
    setSelectedBedId(bedId);
    setSelectedPlantingId(plantingId);

    const bed = beds.find((b) => b.id === bedId);
    if (bed) viewport.focusBed(bed);

    if (!isDesktop) openToLarge();
  };

  // Search results
  const bedResults: BedResult[] = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    return beds
      .filter((b) => matchesQueryText(b.label, q))
      .slice(0, 8)
      .map((b) => ({ id: b.id, label: b.label }));
  }, [beds, query]);

  const cropResults: CropResult[] = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    const out: CropResult[] = [];

    for (const p of props.plantings) {
      if (!matchesPlanting(p, q)) continue;
      const bed = beds.find((b) => b.id === p.bed_id);
      out.push({
        plantingId: p.id,
        crop: p.crop ?? "Unknown",
        bedId: p.bed_id,
        bedLabel: bed?.label ?? "Bed",
        subtitle: p.status ?? undefined,
      });
    }

    const seen = new Set<string>();
    return out
      .filter((r) => (seen.has(r.plantingId) ? false : (seen.add(r.plantingId), true)))
      .slice(0, 10);
  }, [props.plantings, beds, query]);

  // Close search on outside click
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

  return (
    <div ref={measureRef} className="relative h-full w-full">
      {!ready ? (
        <div className="absolute inset-0 grid place-items-center">
          <div className="text-sm text-(--rose-muted)">Loading map…</div>
        </div>
      ) : (
        <>
          {/* Search overlay */}
          <div ref={searchBoxRef} className="fixed left-4 top-4 z-90 pointer-events-auto">
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
                    selectPlantingById(cropResults[0].bedId, cropResults[0].plantingId);
                    setSearchOpen(false);
                  } else if (bedResults[0]) {
                    selectBedById(bedResults[0].id);
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
              onPickBed={(bedId) => selectBedById(bedId)}
              onPickCrop={(bedId, plantingId) => selectPlantingById(bedId, plantingId)}
              onClose={() => setSearchOpen(false)}
            />
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
            onSelectBed={selectBedById}
            onSelectPin={selectPlantingById}
            onTapBackground={clearSelection}
            onWheel={viewport.onWheel}
            onTouchStart={viewport.onTouchStart}
            onTouchMove={viewport.onTouchMove}
            onTouchEnd={viewport.onTouchEnd}
            onDragEnd={(pos) => viewport.setVp((p) => ({ ...p, x: pos.x, y: pos.y }))}
          />

          <FloatingControls onReset={viewport.fitToContent} />

          {/* Desktop only: left dock */}
          {isDesktop ? (
            <DesktopPlacePanel
              open={true}
              bedLabel={selectedBed ? selectedBed.label : null}
              role={role}
              plantings={selectedBedPlantings}
              selectedPlantingId={selectedPlanting?.id ?? null}
              onSelectPlanting={(id) => setSelectedPlantingId(id)}
            />
          ) : null}

          {/* Mobile only: bottom cards */}
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
                <div className="text-sm text-(--rose-muted)">
                  No plantings match your search for this bed.
                </div>
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
