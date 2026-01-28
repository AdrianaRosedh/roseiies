import GardenViewer from "@/components/garden/GardenViewer";
import { loadPublishedGardenLayout } from "@/lib/garden/load-published-layout";
import { loadGardenPlantings } from "@/lib/garden/load-plantings";

export default async function GardenPublicPage() {
  const tenantId = "olivea"; // keep for now

  const data = await loadPublishedGardenLayout(tenantId);

  const plantings =
    data?.layout?.garden_id
      ? await loadGardenPlantings({ tenantId, gardenId: data.layout.garden_id })
      : [];

  return (
    <main className="relative h-dvh w-screen overflow-hidden bg-(--rose-bg)">
      {/* header overlay */}
      <div className="pointer-events-none absolute left-4 top-4 z-20">
        <div className="pointer-events-auto rounded-2xl border border-(--rose-border) bg-(--rose-surface)/80 backdrop-blur px-4 py-3 shadow-sm">
          <div className="text-sm text-(--rose-muted)">Olivea</div>
          <h1 className="text-lg font-semibold text-(--rose-ink)">Olivea — Garden</h1>
        </div>
      </div>

      {!data ? (
        <div className="absolute inset-0 grid place-items-center p-6">
          <div className="rounded-2xl border border-(--rose-border) bg-(--rose-surface) backdrop-blur shadow-sm p-6 text-sm text-(--rose-muted)">
            No published layout found yet.
          </div>
        </div>
      ) : (
        <div className="absolute inset-0">
          <GardenViewer
            canvas={data.layout.canvas}
            items={data.items}
            plantings={plantings}
            role="guest"
          />
        </div>
      )}
    </main>
  );
}
