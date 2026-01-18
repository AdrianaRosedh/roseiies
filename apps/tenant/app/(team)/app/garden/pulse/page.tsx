"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { eventsThisWeek, type GardenEvent } from "@lib/garden/events";
import { OLIVEA_GARDEN_MAP_V1 } from "@lib/garden/map-data";

function bedName(bedId: string) {
  return OLIVEA_GARDEN_MAP_V1.beds.find((b) => b.id === bedId)?.name ?? bedId;
}

export default function TeamGardenPulsePage() {
  const [items, setItems] = useState<GardenEvent[]>([]);

  useEffect(() => {
    setItems(eventsThisWeek());
  }, []);

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-12">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-2xl font-semibold">Pulse</h1>
          <p className="mt-2 text-sm opacity-80">This week at a glance.</p>
        </div>

        <Link
          href="/app"
          className="rounded-md border border-white/15 px-4 py-2 text-sm hover:bg-white/5"
        >
          Back →
        </Link>
      </div>

      <section className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="text-xs opacity-60">Last 7 days</div>

        {items.length === 0 ? (
          <div className="mt-3 text-sm opacity-75">
            No events yet. Add one in <Link className="underline" href="/app/garden/capture">Capture</Link>.
          </div>
        ) : (
          <ul className="mt-4 space-y-2">
            {items.slice(0, 20).map((e) => (
              <li key={e.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-center justify-between text-xs opacity-70">
                  <span className="capitalize">{e.type}</span>
                  <span>{new Date(e.createdAt).toLocaleString()}</span>
                </div>
                <div className="mt-2 text-sm opacity-85">
                  <span className="opacity-70">{bedName(e.bedId)}:</span> {e.note}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}