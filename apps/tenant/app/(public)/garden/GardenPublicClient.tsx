"use client";

import GardenLiveViewer from "@/components/garden/GardenLiveViewer";

export default function GardenPublicClient(props: { displayName: string }) {
  const workplaceSlug = "olivea";
  const areaName = "Garden";

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12">
      <h1 className="text-2xl font-semibold">{props.displayName} — Garden</h1>

      <div className="mt-10">
        <div
          className="relative h-[70vh] w-full overflow-hidden rounded-2xl border"
          style={{
            borderColor: "var(--rose-border)",
            backgroundColor: "var(--rose-surface)",
          }}
        >
          <GardenLiveViewer workplaceSlug={workplaceSlug} areaName={areaName} />
        </div>
      </div>
    </main>
  );
}
