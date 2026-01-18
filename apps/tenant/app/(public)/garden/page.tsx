import { getRequestTheme } from "@lib/tenant";
import GardenViewer from "@/components/garden/GardenViewer";
import { loadPublishedGardenLayout } from "@/lib/garden/load-published-layout";
import { loadGardenPlantings } from "@/lib/garden/load-plantings";

export default async function GardenPublicPage() {
  const theme = await getRequestTheme();
  const tenantId = "olivea"; // keep for now

  const data = await loadPublishedGardenLayout(tenantId);

  const plantings =
    data?.layout?.garden_id
      ? await loadGardenPlantings({ tenantId, gardenId: data.layout.garden_id })
      : [];

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12">
      <h1 className="text-2xl font-semibold">{theme.displayName} — Garden</h1>

      <div className="mt-10">
        {!data ? (
          <div className="rounded-2xl border border-(--rose-border) bg-(--rose-surface) backdrop-blur shadow-sm p-6 text-sm text-(--rose-muted)">
            No published layout found yet.
          </div>
        ) : (
          <GardenViewer
            canvas={data.layout.canvas}
            items={data.items}
            plantings={plantings}
            role="guest"
          />
        )}
      </div>
    </main>
  );
}
