"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { addEvent, type GardenEventType } from "@lib/garden/events";
import { OLIVEA_GARDEN_MAP_V1 } from "@lib/garden/map-data";

export default function TeamGardenCapturePage() {
  const bedOptions = useMemo(() => OLIVEA_GARDEN_MAP_V1.beds, []);
  const [type, setType] = useState<GardenEventType>("harvest");
  const [bedId, setBedId] = useState<string>(bedOptions[0]?.id ?? "bed-01");
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState<null | { bedId: string; type: string }>(null);

  function onSave() {
    if (!note.trim()) return;
    addEvent({ type, bedId, note: note.trim() });
    setNote("");
    setSaved({ bedId, type });
    window.setTimeout(() => setSaved(null), 1800);
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-2xl font-semibold">Capture</h1>
          <p className="mt-2 text-sm opacity-80">
            Log a moment in the garden. (V1: saved locally — Supabase next.)
          </p>
        </div>

        <Link
          href="/app"
          className="rounded-md border border-white/15 px-4 py-2 text-sm hover:bg-white/5"
        >
          Back →
        </Link>
      </div>

      <form
        className="mt-10 space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6"
        onSubmit={(e) => {
          e.preventDefault();
          onSave();
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <div className="mb-1 text-xs opacity-60">Type</div>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as GardenEventType)}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2"
            >
              <option value="harvest">Harvest</option>
              <option value="observation">Observation</option>
              <option value="planting">Planting</option>
            </select>
          </label>

          <label className="text-sm">
            <div className="mb-1 text-xs opacity-60">Bed</div>
            <select
              value={bedId}
              onChange={(e) => setBedId(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2"
            >
              {bedOptions.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="text-sm">
          <div className="mb-1 text-xs opacity-60">Note</div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="min-h-30 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2"
            placeholder="What happened? What changed? Any intuition worth remembering?"
          />
        </label>

        <button
          type="submit"
          className="w-full rounded-xl bg-(--accent) px-4 py-3 text-sm font-medium text-black disabled:opacity-60"
          disabled={!note.trim()}
        >
          Save
        </button>

        {saved ? (
          <div className="text-center text-xs opacity-70">
            Saved ✓
          </div>
        ) : null}
      </form>
    </main>
  );
}