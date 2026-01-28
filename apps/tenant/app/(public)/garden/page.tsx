// apps/tenant/app/(public)/garden/page.tsx
import { getRequestTheme } from "@lib/tenant";
import GardenLiveViewer from "@/components/garden/GardenLiveViewer";

export default async function GardenPublicPage() {
  const theme = await getRequestTheme();

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12">
      <h1 className="text-2xl font-semibold">{theme.displayName} — Garden</h1>

      <div className="mt-10">
        <GardenLiveViewer workplaceSlug="olivea" areaName="Garden" />
      </div>
    </main>
  );
}
