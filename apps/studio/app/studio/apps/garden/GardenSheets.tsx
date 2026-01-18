"use client";

import { useEffect, useMemo, useState } from "react";
import type { PortalContext } from "../../../lib/portal/getPortalContext";

type PlantingRow = {
  id: string;
  bed_id: string | null;
  crop: string | null;
  status: string | null;
  planted_at: string | null;
  pin_x: number | null;
  pin_y: number | null;
};

type ColType = "text" | "select" | "date";

type Column = {
  key: keyof PlantingRow | string;
  label: string;
  type: ColType;
  width?: number;
};

function lsKey(tenantId: string) {
  return `roseiies:garden:sheets:cols:${tenantId}`;
}

export default function GardenSheets({
  store,
  portal,
}: {
  store: any;
  portal: PortalContext;
}) {
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

  const [rows, setRows] = useState<PlantingRow[]>([]);
  const [loading, setLoading] = useState(false);

  // Column schema (Airtable-ish)
  const defaultCols: Column[] = useMemo(
    () => [
      { key: "crop", label: "Crop", type: "text", width: 260 },
      { key: "bed_id", label: "Bed", type: "select", width: 220 },
      { key: "planted_at", label: "Planted", type: "date", width: 160 },
      { key: "status", label: "Status", type: "text", width: 160 },
      { key: "pin_x", label: "Pin", type: "text", width: 110 },
    ],
    []
  );

  const [cols, setCols] = useState<Column[]>(defaultCols);

  // Inline edit state
  const [editing, setEditing] = useState<{ rowId: string; colKey: string } | null>(null);
  const [draft, setDraft] = useState<string>("");

  // Load column schema from localStorage (tenant-scoped)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(lsKey(portal.tenantId));
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) setCols(parsed);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portal.tenantId]);

  useEffect(() => {
    try {
      localStorage.setItem(lsKey(portal.tenantId), JSON.stringify(cols));
    } catch {}
  }, [cols, portal.tenantId]);

  async function refresh() {
    if (!activeGarden?.name) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/plantings?tenantId=${encodeURIComponent(portal.tenantId)}&gardenName=${encodeURIComponent(
          activeGarden.name
        )}`
      );
      const text = await res.text();
      const json = text ? JSON.parse(text) : null;

      if (!res.ok) {
        console.error("Plantings API error:", res.status, json ?? text);
        setRows([]);
        return;
      }

      setRows(Array.isArray(json) ? (json as PlantingRow[]) : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGarden?.name, portal.tenantId]);

  function bedLabel(id: string | null) {
    if (!id) return "";
    return beds.find((b: any) => b.id === id)?.label ?? id;
  }

  function startEdit(rowId: string, colKey: string, initial: any) {
    setEditing({ rowId, colKey });
    setDraft(initial == null ? "" : String(initial));
  }

  async function commitEdit() {
    if (!editing) return;

    const { rowId, colKey } = editing;
    const row = rows.find((r) => r.id === rowId);
    if (!row) return;

    const patch: any = {};
    // special cases
    if (colKey === "pin_x") {
      patch.pin_x = draft === "" ? null : Number(draft);
    } else if (colKey === "pin_y") {
      patch.pin_y = draft === "" ? null : Number(draft);
    } else if (colKey === "bed_id") {
      patch.bed_id = draft === "" ? null : draft;
    } else {
      patch[colKey] = draft === "" ? null : draft;
    }

    // Optimistic update
    setRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, ...patch } : r))
    );

    setEditing(null);
    setDraft("");

    // Persist
    await fetch(`/api/plantings?id=${encodeURIComponent(rowId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...patch }),
    });
  }

  function addColumn() {
    const name = prompt("Column name?");
    if (!name) return;

    const key = name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "");

    // This adds a UI column. Persisting a new DB column comes later via schema management.
    setCols((prev) => [
      ...prev,
      { key, label: name.trim(), type: "text", width: 180 },
    ]);
  }

  return (
    <div className="w-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="text-xs text-black/55">Garden</div>
          <div className="text-lg font-semibold truncate">{activeGarden?.name ?? "—"}</div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={addColumn}
            className="rounded-lg border border-black/10 bg-white/60 px-3 py-2 text-sm backdrop-blur hover:bg-white/80"
          >
            + Add column
          </button>

          <button
            onClick={refresh}
            className="rounded-lg border border-black/10 bg-white/60 px-3 py-2 text-sm backdrop-blur hover:bg-white/80"
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="rounded-xl border border-black/10 bg-white/55 backdrop-blur shadow-sm overflow-hidden">
        {/* Header row */}
        <div className="flex border-b border-black/10 bg-white/70">
          {cols.map((c) => (
            <div
              key={String(c.key)}
              className="px-3 py-2 text-xs font-semibold text-black/70 border-r border-black/10 last:border-r-0"
              style={{ width: c.width ?? 180 }}
            >
              {c.label}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="max-h-[70vh] overflow-auto">
          {rows.length === 0 ? (
            <div className="p-6 text-sm text-black/55">
              No plantings yet.
            </div>
          ) : (
            rows.map((r) => (
              <div key={r.id} className="flex border-b border-black/5 last:border-b-0">
                {cols.map((c) => {
                  const key = String(c.key);
                  const isEditing = editing?.rowId === r.id && editing?.colKey === key;

                  let value: any = (r as any)[key];

                  if (key === "bed_id") value = bedLabel(r.bed_id);
                  if (key === "pin_x") value = r.pin_x != null && r.pin_y != null ? "✅" : "—";

                  return (
                    <div
                      key={key}
                      className="px-3 py-2 text-sm border-r border-black/5 last:border-r-0"
                      style={{ width: c.width ?? 180 }}
                      onDoubleClick={() => {
                        if (key === "pin_x") return; // read-only indicator
                        if (key === "bed_id") startEdit(r.id, key, r.bed_id ?? "");
                        else startEdit(r.id, key, (r as any)[key] ?? "");
                      }}
                    >
                      {isEditing ? (
                        c.type === "select" && key === "bed_id" ? (
                          <select
                            autoFocus
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            onBlur={commitEdit}
                            className="w-full rounded-md border border-black/10 bg-white px-2 py-1 text-sm"
                          >
                            <option value="">—</option>
                            {beds.map((b: any) => (
                              <option key={b.id} value={b.id}>
                                {b.label}
                              </option>
                            ))}
                          </select>
                        ) : c.type === "date" ? (
                          <input
                            autoFocus
                            type="date"
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            onBlur={commitEdit}
                            className="w-full rounded-md border border-black/10 bg-white px-2 py-1 text-sm"
                          />
                        ) : (
                          <input
                            autoFocus
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            onBlur={commitEdit}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") commitEdit();
                              if (e.key === "Escape") {
                                setEditing(null);
                                setDraft("");
                              }
                            }}
                            className="w-full rounded-md border border-black/10 bg-white px-2 py-1 text-sm"
                          />
                        )
                      ) : (
                        <div className="text-black/80 truncate">
                          {value == null || value === "" ? <span className="text-black/30">—</span> : value}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-2 text-xs text-black/45">
        Tip: Double-click a cell to edit. “Bed” maps plantings to Designer regions.
      </div>
    </div>
  );
}
