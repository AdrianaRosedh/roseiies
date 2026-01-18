import Link from "next/link";
import GardenMap from "@components/garden/GardenMap";
import { OLIVEA_GARDEN_MAP_V1 } from "@lib/garden/map-data";

export default function TeamGardenMapPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-2xl font-semibold">Garden Map</h1>
          <p className="mt-2 text-sm opacity-80">Team view — full access.</p>
        </div>

        <Link
          href="/app"
          className="rounded-md border border-white/15 px-4 py-2 text-sm hover:bg-white/5"
        >
          Back →
        </Link>
      </div>

      <div className="mt-10">
        <GardenMap mode="team" data={OLIVEA_GARDEN_MAP_V1} />
      </div>
    </main>
  );
}