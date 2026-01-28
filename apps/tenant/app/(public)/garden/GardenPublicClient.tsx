"use client";

import GardenViewer from "@/components/garden/GardenViewer";
import { useLiveGarden } from "@lib/garden/useLiveGarden";

export default function GardenPublicClient(props: { displayName: string }) {
  const workplaceSlug = "olivea";
  const areaName = "Garden";

  const live = useLiveGarden({ workplaceSlug, areaName, pollMs: 2500 });

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12">
      <h1 className="text-2xl font-semibold">{props.displayName} — Garden</h1>

      <div className="mt-10">
        {live.loading ? (
          <div className="rounded-2xl border border-(--rose-border) bg-(--rose-surface) backdrop-blur shadow-sm p-6 text-sm text-(--rose-muted)">
            Loading…
          </div>
        ) : live.error ? (
          <div className="rounded-2xl border border-(--rose-border) bg-(--rose-surface) backdrop-blur shadow-sm p-6 text-sm text-red-700">
            {live.error}
          </div>
        ) : !live.layout ? (
          <div className="rounded-2xl border border-(--rose-border) bg-(--rose-surface) backdrop-blur shadow-sm p-6 text-sm text-(--rose-muted)">
            No published layout found yet.
          </div>
        ) : (
          <GardenViewer
            canvas={live.layout.canvas}
            items={live.items ?? []}
            plantings={live.plantings ?? []}
            role="guest"
          />
        )}
      </div>
    </main>
  );
}
