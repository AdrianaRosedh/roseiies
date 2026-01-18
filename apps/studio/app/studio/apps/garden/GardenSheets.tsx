"use client";

import { useEffect, useMemo, useState } from "react";

type Planting = {
  id: string;
  bed_id: string;
  crop: string;
  status: string | null;
  planted_at: string | null;
  pin_x: number | null;
  pin_y: number | null;
};

export default function GardenSheets({ store }: { store: any }) {
  const tenantId = "olivea"; // V1 hardcode (you already hardcode in publish) :contentReference[oaicite:3]{index=3}

  const activeGarden = useMemo(
    () => store.state.gardens.find((g: any) => g.id === store.state.activeGardenId) ?? null,
    [store.state]
  );

  const doc = useMemo(() => {
    const id = store.state.activeLayoutId;
    if (!id) return null;
    return store.state.docs[id] ?? null;
  }, [store.state]);

  const beds = useMemo(() => {
    const items = doc?.items ?? [];
    return items.filter((it: any) => it.type === "bed");
  }, [doc]);

  const [rows, setRows] = useState<Planting[]>([]);
  const [loading, setLoading] = useState(false);

  const [draft, setDraft] = useState({
    bed_id: "",
    crop: "",
    planted_at: "",
  });

  async function refresh() {
    if (!activeGarden?.name) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/plantings?tenantId=${encodeURIComponent(tenantId)}&gardenName=${encodeURIComponent(
          activeGarden.name
        )}`
      );
      const json = await res.json();
      setRows(Array.isArray(json) ? json : json?.data ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGarden?.name]);

  async function addPlanting() {
    if (!activeGarden?.name || !draft.bed_id || !draft.crop) return;

    const resGarden = await fetch(
      `/api/plantings/garden-id?tenantId=${encodeURIComponent(
        tenantId
      )}&gardenName=${encodeURIComponent(activeGarden.name)}`
    );
    const { gardenId } = await resGarden.json();

    await fetch("/api/plantings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenant_id: tenantId,
        garden_id: gardenId,
        bed_id: draft.bed_id,
        crop: draft.crop,
        planted_at: draft.planted_at || null,
        pin_x: null,
        pin_y: null,
      }),
    });

    setDraft({ bed_id: "", crop: "", planted_at: "" });
    refresh();
  }

  return (
    <div className="h-[calc(100vh-56px)] p-6">
      <div className="flex items-end justify-between gap-6">
        <div>
          <div className="text-sm opacity-60">Garden</div>
          <div className="text-2xl font-semibold">{activeGarden?.name ?? "—"}</div>
        </div>

        <button
          onClick={refresh}
          className="rounded-lg border border-black/10 bg-white px-3 py-1.5 text-sm"
        >
          Refresh
        </button>
      </div>

      {/* Add row */}
      <div className="mt-6 rounded-2xl border border-black/10 bg-white p-4">
        <div className="text-sm font-semibold">Add planting</div>

        <div className="mt-3 grid gap-3 md:grid-cols-4">
          <select
            className="rounded-lg border border-black/10 px-3 py-2 text-sm"
            value={draft.bed_id}
            onChange={(e) => setDraft((d) => ({ ...d, bed_id: e.target.value }))}
          >
            <option value="">Select bed…</option>
            {beds.map((b: any) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </select>

          <input
            className="rounded-lg border border-black/10 px-3 py-2 text-sm"
            placeholder="Crop (e.g. zanahoria morada)"
            value={draft.crop}
            onChange={(e) => setDraft((d) => ({ ...d, crop: e.target.value }))}
          />

          <input
            type="date"
            className="rounded-lg border border-black/10 px-3 py-2 text-sm"
            value={draft.planted_at}
            onChange={(e) => setDraft((d) => ({ ...d, planted_at: e.target.value }))}
          />

          <button
            onClick={addPlanting}
            className="rounded-lg border border-black/10 bg-black px-3 py-2 text-sm text-white"
          >
            Add
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-black/10 bg-white">
        <div className="border-b border-black/10 px-4 py-3 text-sm font-semibold">
          Plantings {loading ? <span className="ml-2 text-xs opacity-60">loading…</span> : null}
        </div>

        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-black/5 text-left">
              <tr>
                <th className="px-4 py-2">Crop</th>
                <th className="px-4 py-2">Bed</th>
                <th className="px-4 py-2">Planted</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Pin</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-black/5">
                  <td className="px-4 py-2">{r.crop}</td>
                  <td className="px-4 py-2">
                    {beds.find((b: any) => b.id === r.bed_id)?.label ?? r.bed_id}
                  </td>
                  <td className="px-4 py-2">{r.planted_at ?? "—"}</td>
                  <td className="px-4 py-2">{r.status ?? "growing"}</td>
                  <td className="px-4 py-2">
                    {r.pin_x != null && r.pin_y != null ? "✅" : "—"}
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 opacity-60" colSpan={5}>
                    No plantings yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
