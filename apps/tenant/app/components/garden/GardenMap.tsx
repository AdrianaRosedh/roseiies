// apps/tenant/app/components/garden/GardenMap.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import type { GardenBed, GardenMapData } from "@lib/garden/map-data";
import { eventsForBed } from "@lib/garden/events";
import SharePopover from "./SharePopover";

type Props = {
  mode: "public" | "team";
  data: GardenMapData;
};

function bedFill(bed: GardenBed) {
  switch (bed.status) {
    case "abundant":
      return "rgba(94,118,88,0.35)";
    case "fragile":
      return "rgba(245,158,11,0.22)";
    case "dormant":
    default:
      return "rgba(148,163,184,0.18)";
  }
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function GardenMap({ mode, data }: Props) {
  // V1 “publish” toggle is local-only (later: Studio + DB)
  const [publishedLocal, setPublishedLocal] = useState<Record<string, boolean>>(
    () => Object.fromEntries(data.beds.map((b) => [b.id, b.published]))
  );

  const effectivePublished = (id: string) =>
    publishedLocal[id] ?? data.beds.find((b) => b.id === id)?.published ?? false;

  const visibleBeds = useMemo(() => {
    const all = data.beds;
    return mode === "public" ? all.filter((b) => effectivePublished(b.id)) : all;
  }, [data.beds, mode, publishedLocal]);

  const [activeId, setActiveId] = useState<string | null>(
    visibleBeds[0]?.id ?? null
  );

  const active =
    visibleBeds.find((b) => b.id === activeId) ?? visibleBeds[0] ?? null;

  // Read local events for the active bed (V1 localStorage)
  const timeline = useMemo(() => {
    if (!active) return [];
    return eventsForBed(active.id); // newest-first (we unshift on save)
  }, [active?.id]);

  // ----------------------------
  // Canva-style Share popover
  // ----------------------------
  const [shareOpen, setShareOpen] = useState(false);

  const publicUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    const u = new URL(window.location.href);

    // If you're in team mode, copy the public garden route.
    // Adjust if your real public route is different.
    if (mode === "team") {
      u.pathname = "/garden";
      u.searchParams.delete("mode");
    }

    return u.toString();
  }, [mode]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setShareOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <SharePopover
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title="Share garden map"
        publicUrl={publicUrl}
        accessLabel={mode === "team" ? "Public view link" : "Public view link"}
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        {/* Map */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm opacity-70">
                {mode === "public" ? "Garden Map (curated)" : "Garden Map (team)"}
              </div>
              <div className="mt-1 text-xs opacity-60">Tap a bed</div>
            </div>

            <div className="flex items-center gap-2">
              <button
                className="rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-xs text-white/80 hover:bg-white/5"
                onClick={() => setShareOpen(true)}
              >
                Share
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-white/10 bg-black/30">
            <svg
              viewBox={data.viewBox}
              className="h-auto w-full"
              role="img"
              aria-label="Garden map"
            >
              {visibleBeds.map((bed) => {
                const isActive = bed.id === active?.id;
                const stroke = isActive
                  ? "rgba(243,240,232,0.8)"
                  : "rgba(243,240,232,0.25)";

                return (
                  <polygon
                    key={bed.id}
                    points={bed.points}
                    fill={bedFill(bed)}
                    stroke={stroke}
                    strokeWidth={isActive ? 3 : 1.4}
                    className="cursor-pointer transition-all"
                    onClick={() => setActiveId(bed.id)}
                  />
                );
              })}
            </svg>
          </div>

          {mode === "team" ? (
            <div className="mt-3 text-xs opacity-60">
              V1: publish/unpublish is local only (DB later via Studio).
            </div>
          ) : null}
        </div>

        {/* Drawer */}
        <aside className="rounded-2xl border border-white/10 bg-white/5 p-5">
          {!active ? (
            <div className="text-sm opacity-70">Select a bed</div>
          ) : (
            <>
              <div className="text-xs opacity-60">Selected</div>
              <h3 className="mt-1 text-lg font-semibold">{active.name}</h3>

              <div className="mt-3 text-sm opacity-80">
                Status:{" "}
                <span className="opacity-90">{active.status ?? "unknown"}</span>
              </div>

              {mode === "public" ? (
                <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4 text-sm">
                  <div className="text-xs opacity-60">Highlight</div>
                  <div className="mt-1">{active.publicHighlight ?? "—"}</div>
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  {/* Publish toggle */}
                  <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm">
                    <div className="text-xs opacity-60">Public visibility</div>

                    <div className="mt-2 flex items-center justify-between gap-4">
                      <div className="text-sm opacity-85">
                        {effectivePublished(active.id)
                          ? "Published (visible on /garden)"
                          : "Private (hidden from /garden)"}
                      </div>

                      <button
                        className="rounded-lg border border-white/15 px-3 py-2 text-xs hover:bg-white/5"
                        onClick={() =>
                          setPublishedLocal((prev) => ({
                            ...prev,
                            [active.id]: !effectivePublished(active.id),
                          }))
                        }
                      >
                        Toggle
                      </button>
                    </div>

                    <div className="mt-3 text-xs opacity-60">
                      Next: move this toggle to Studio + DB.
                    </div>
                  </div>

                  {/* Timeline (real local events) */}
                  <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm">
                    <div className="text-xs opacity-60">Timeline</div>

                    {timeline.length === 0 ? (
                      <div className="mt-2 text-sm opacity-75">
                        No events yet. Add one in Capture.
                      </div>
                    ) : (
                      <ul className="mt-3 space-y-2">
                        {timeline.slice(0, 8).map((e) => (
                          <li
                            key={e.id}
                            className="rounded-lg border border-white/10 bg-white/5 p-3"
                          >
                            <div className="flex items-center justify-between text-xs opacity-70">
                              <span className="capitalize">{e.type}</span>
                              <span>{fmtDate(e.createdAt)}</span>
                            </div>
                            <div className="mt-2 text-sm">{e.note}</div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <a
                    href="/app/garden/capture"
                    className="block w-full rounded-xl bg-(--accent) px-4 py-3 text-center text-sm font-medium text-black"
                  >
                    Add event →
                  </a>
                </div>
              )}
            </>
          )}
        </aside>
      </div>
    </>
  );
}
