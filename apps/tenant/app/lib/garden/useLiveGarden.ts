"use client";

import { useEffect, useRef, useState } from "react";

export type LiveGardenState = {
  loading: boolean;
  error: string | null;
  layout: any | null;
  items: any[];
  plantings: any[];
};

async function fetchJson(url: string) {
  const res = await fetch(url, { cache: "no-store", headers: { "cache-control": "no-cache" } });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

export function useLiveGarden(args: {
  workplaceSlug: string;
  areaName?: string;
  pollMs?: number;
}) {
  const workplaceSlug = args.workplaceSlug ?? "olivea";
  const areaName = args.areaName ?? "Garden";
  const pollMs = args.pollMs ?? 2500;

  const [state, setState] = useState<LiveGardenState>({
    loading: true,
    error: null,
    layout: null,
    items: [],
    plantings: [],
  });

  const lastLayoutId = useRef<string | null>(null);
  const lastLayoutVersion = useRef<number | null>(null);

  useEffect(() => {
    let alive = true;

    const tick = async () => {
      try {
        const published = await fetchJson(
          `/api/garden/published?workplaceSlug=${encodeURIComponent(workplaceSlug)}&areaName=${encodeURIComponent(areaName)}`
        );

        const nextLayout = published?.layout ?? null;
        const nextItems = Array.isArray(published?.items) ? published.items : [];

        // Only refetch plantings if layout context exists (cheap guard)
        const plantingsJson = await fetchJson(
          `/api/garden/plantings?workplaceSlug=${encodeURIComponent(workplaceSlug)}&areaName=${encodeURIComponent(areaName)}`
        );
        const nextPlantings = Array.isArray(plantingsJson?.rows) ? plantingsJson.rows : [];

        if (!alive) return;

        // lightweight diffing to avoid extra rerenders
        const nextId = nextLayout?.id ?? null;
        const nextVer = Number(nextLayout?.version ?? 0) || 0;

        const changed =
          nextId !== lastLayoutId.current ||
          nextVer !== lastLayoutVersion.current;

        lastLayoutId.current = nextId;
        lastLayoutVersion.current = nextVer;

        setState((prev) => ({
          loading: false,
          error: null,
          layout: nextLayout,
          items: changed ? nextItems : prev.items, // only swap if changed
          plantings: nextPlantings,
        }));
      } catch (e: any) {
        if (!alive) return;
        setState((prev) => ({
          ...prev,
          loading: false,
          error: e?.message ?? "Failed to load garden",
        }));
      }
    };

    tick();
    const id = window.setInterval(tick, pollMs);

    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [workplaceSlug, areaName, pollMs]);

  return state;
}
