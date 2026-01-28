// apps/tenant/app/(public)/garden/page.tsx
import { getRequestTheme } from "@lib/tenant";
import GardenLiveViewer from "@/components/garden/GardenLiveViewer";

export default async function GardenPublicPage() {
  const theme = await getRequestTheme();

  return (
    <main className="relative h-svh w-full overflow-hidden">
      {/* Simple top-left title overlay (optional) */}
      <div className="pointer-events-none absolute left-5 top-5 z-20">
        <div className="rounded-2xl border border-black/10 bg-white/75 px-4 py-3 backdrop-blur">
          <div className="text-[12px] tracking-wide text-black/45">Olivea</div>
          <h1 className="text-[18px] font-semibold text-black/85">
            {theme.displayName} — Garden
          </h1>
        </div>
      </div>

      {/* Full-bleed viewer */}
      <div className="absolute inset-0">
        <GardenLiveViewer workplaceSlug="olivea" areaName="Garden" />
      </div>
    </main>
  );
}
