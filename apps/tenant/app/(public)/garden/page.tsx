import { getRequestTheme } from "@lib/tenant";
import GardenViewer from "@/components/garden/GardenViewer";
import { loadPublishedGardenLayout } from "@/lib/garden/load-published-layout";

export default async function GardenPublicPage() {
  const theme = await getRequestTheme();
  const tenantId = "olivea"; // hardcode for now (domain-based next)

  const data = await loadPublishedGardenLayout(tenantId);

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12">
      <h1 className="text-2xl font-semibold">{theme.displayName} — Garden</h1>
      <p className="mt-2 text-sm opacity-80">
        Public view (published layout from Studio).
      </p>

      <div className="mt-10">
        {!data ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm opacity-80">
            No published layout found yet.
          </div>
        ) : (
          <GardenViewer canvas={data.layout.canvas} items={data.items} />
        )}
      </div>
    </main>
  );
}