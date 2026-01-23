"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

type ColType = "text" | "number" | "select" | "date" | "checkbox" | "attachment";

type Column = {
  key: keyof PlantingRow | string;
  label: string;
  type: ColType;
  width?: number;
  options?: { values: string[] };
};

type AttachmentItem = {
  name: string;
  dataUrl: string;
};

function lsColsKey(tenantId: string) {
  return `roseiies:garden:sheets:cols:${tenantId}`;
}

function lsCellsKey(tenantId: string, gardenName: string) {
  return `roseiies:garden:sheets:cells:${tenantId}:${gardenName}`;
}

function isCoreKey(k: string): k is keyof PlantingRow {
  return (
    k === "id" ||
    k === "bed_id" ||
    k === "crop" ||
    k === "status" ||
    k === "planted_at" ||
    k === "pin_x" ||
    k === "pin_y"
  );
}

function emptyDraftRow(): Omit<PlantingRow, "id"> {
  return {
    bed_id: null,
    crop: null,
    status: null,
    planted_at: null,
    pin_x: null,
    pin_y: null,
  };
}

function getStudioToken(): string | null {
  // Public token (dev-only). If not set, we’ll avoid sending "undefined".
  const t = process.env.NEXT_PUBLIC_ROSEIIES_STUDIO_TOKEN;
  if (!t || t.trim() === "") return null;
  return t.trim();
}

export default function GardenSheets({
  store,
  portal,
  onGoDesign,
}: {
  store: any;
  portal: PortalContext;
  onGoDesign?: () => void;
}) {
  const activeGarden = useMemo(
    () =>
      store.state.gardens.find((g: any) => g.id === store.state.activeGardenId) ??
      null,
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

  const gardenName = activeGarden?.name ?? "";

  const [rows, setRows] = useState<PlantingRow[]>([]);
  const [loading, setLoading] = useState(false);

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

  const [customCells, setCustomCells] = useState<Record<string, Record<string, any>>>({});

  const [draftRow, setDraftRow] = useState<Omit<PlantingRow, "id">>(emptyDraftRow());

  const [editing, setEditing] = useState<{ rowId: string; colKey: string } | null>(null);
  const [draft, setDraft] = useState<any>("");

  const [renaming, setRenaming] = useState<{ colKey: string } | null>(null);
  const [renameDraft, setRenameDraft] = useState<string>("");

  const [colConfig, setColConfig] = useState<{ colKey: string } | null>(null);

  const gridRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(lsColsKey(portal.tenantId));
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) setCols(parsed);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portal.tenantId]);

  useEffect(() => {
    try {
      localStorage.setItem(lsColsKey(portal.tenantId), JSON.stringify(cols));
    } catch {}
  }, [cols, portal.tenantId]);

  useEffect(() => {
    if (!portal.tenantId || !gardenName) return;
    try {
      const raw = localStorage.getItem(lsCellsKey(portal.tenantId, gardenName));
      if (raw) setCustomCells(JSON.parse(raw) ?? {});
      else setCustomCells({});
    } catch {
      setCustomCells({});
    }
  }, [portal.tenantId, gardenName]);

  useEffect(() => {
    if (!portal.tenantId || !gardenName) return;
    try {
      localStorage.setItem(lsCellsKey(portal.tenantId, gardenName), JSON.stringify(customCells));
    } catch {}
  }, [customCells, portal.tenantId, gardenName]);

  async function refresh() {
    if (!activeGarden?.name) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/plantings?gardenName=${encodeURIComponent(activeGarden.name)}`
      );

      const text = await res.text();
      const json = text ? JSON.parse(text) : null;

      // ✅ Treat 404 as empty (defensive)
      if (res.status === 404) {
        setRows([]);
        return;
      }

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

  function getCellValue(rowId: string, colKey: string, row: PlantingRow | null) {
    if (rowId === "__new__") {
      if (isCoreKey(colKey)) return (draftRow as any)[colKey];
      return (customCells["__new__"] ?? {})[colKey];
    }

    if (row && isCoreKey(colKey)) return (row as any)[colKey];
    return (customCells[rowId] ?? {})[colKey];
  }

  function setCustomCell(rowId: string, colKey: string, value: any) {
    setCustomCells((prev) => ({
      ...prev,
      [rowId]: { ...(prev[rowId] ?? {}), [colKey]: value },
    }));
  }

  function startEdit(rowId: string, colKey: string, initial: any) {
    setEditing({ rowId, colKey });
    const col = cols.find((c) => String(c.key) === colKey);
    if (col?.type === "checkbox") setDraft(Boolean(initial));
    else setDraft(initial == null ? "" : initial);
  }

  function stopEdit() {
    setEditing(null);
    setDraft("");
  }

  async function persistCorePatch(rowId: string, patch: Record<string, any>) {
    const token = getStudioToken();
    if (!token) {
      console.error("Missing NEXT_PUBLIC_ROSEIIES_STUDIO_TOKEN (required for PATCH).");
      return;
    }

    await fetch(`/api/plantings?id=${encodeURIComponent(rowId)}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-roseiies-studio-token": token,
      },
      body: JSON.stringify(patch),
    });
  }

  function coerceByType(col: Column, value: any) {
    if (col.type === "number") {
      if (value === "" || value == null) return null;
      const n = Number(value);
      return Number.isFinite(n) ? n : null;
    }
    if (col.type === "checkbox") return Boolean(value);
    if (col.type === "date") return value === "" ? null : String(value);
    if (col.type === "select") return value === "" ? null : String(value);
    return value === "" ? null : String(value);
  }

  async function commitEdit(opts?: { move?: "down" | "right" | "left" }) {
    if (!editing) return;

    const { rowId, colKey } = editing;
    const col = cols.find((c) => String(c.key) === colKey);
    if (!col) return;

    if (rowId === "__new__") {
      if (isCoreKey(colKey)) {
        setDraftRow((prev) => ({ ...prev, [colKey]: coerceByType(col, draft) } as any));
      } else {
        setCustomCell("__new__", colKey, col.type === "attachment" ? draft : coerceByType(col, draft));
      }

      const nextDraft = {
        ...draftRow,
        ...(isCoreKey(colKey) ? ({ [colKey]: coerceByType(col, draft) } as any) : {}),
      };

      const hasAny =
        Boolean(nextDraft.crop && String(nextDraft.crop).trim()) ||
        Boolean(nextDraft.bed_id && String(nextDraft.bed_id).trim()) ||
        Boolean(nextDraft.planted_at && String(nextDraft.planted_at).trim()) ||
        Boolean(nextDraft.status && String(nextDraft.status).trim());

      stopEdit();

      if (hasAny) {
        await createRowFromDraft(nextDraft);
      }
      return;
    }

    const row = rows.find((r) => r.id === rowId) ?? null;
    if (!row) return;

    if (colKey === "pin_x") {
      stopEdit();
      return;
    }

    if (isCoreKey(colKey)) {
      const patch: any = {};

      if (colKey === "bed_id") patch.bed_id = draft === "" ? null : String(draft);
      else if (colKey === "planted_at") patch.planted_at = draft === "" ? null : String(draft);
      else if (colKey === "crop" || colKey === "status") patch[colKey] = draft === "" ? null : String(draft);
      else if (colKey === "pin_x" || colKey === "pin_y") patch[colKey] = draft === "" ? null : Number(draft);

      setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, ...patch } : r)));

      stopEdit();
      await persistCorePatch(rowId, patch);
    } else {
      const v = col.type === "attachment" ? draft : coerceByType(col, draft);
      setCustomCell(rowId, colKey, v);
      stopEdit();
    }

    if (opts?.move) {
      const colIndex = cols.findIndex((c) => String(c.key) === colKey);
      const rowIndex = rows.findIndex((r) => r.id === rowId);

      const next =
        opts.move === "right"
          ? { r: rowIndex, c: Math.min(cols.length - 1, colIndex + 1) }
          : opts.move === "left"
            ? { r: rowIndex, c: Math.max(0, colIndex - 1) }
            : { r: Math.min(rows.length, rowIndex + 1), c: colIndex };

      const nextRowId = next.r >= rows.length ? "__new__" : rows[next.r].id;
      const nextColKey = String(cols[next.c].key);
      const nextRow = nextRowId === "__new__" ? null : rows[next.r];

      const initial = getCellValue(nextRowId, nextColKey, nextRow);
      startEdit(nextRowId, nextColKey, nextColKey === "bed_id" ? (nextRow as any)?.bed_id ?? "" : initial ?? "");
    }
  }

  async function createRowFromDraft(nextDraft: Omit<PlantingRow, "id">) {
    const payload = {
      gardenName: activeGarden?.name ?? "",
      bed_id: nextDraft.bed_id,
      crop: nextDraft.crop,
      planted_at: nextDraft.planted_at,
      status: nextDraft.status,
      pin_x: nextDraft.pin_x,
      pin_y: nextDraft.pin_y,
    };

    const tempId = `tmp_${Math.random().toString(16).slice(2)}_${Date.now()}`;
    const optimistic: PlantingRow = { id: tempId, ...nextDraft };
    setRows((prev) => [optimistic, ...prev]);

    const draftCustom = customCells["__new__"] ?? {};

    setDraftRow(emptyDraftRow());
    setCustomCells((prev) => {
      const { ["__new__"]: _, ...rest } = prev;
      return rest;
    });

    try {
      const token = getStudioToken();
      if (!token) {
        console.error("Missing NEXT_PUBLIC_ROSEIIES_STUDIO_TOKEN (required for POST).");
        setRows((prev) => prev.filter((r) => r.id !== tempId));
        setDraftRow(nextDraft);
        setCustomCells((prev) => ({ ...prev, __new__: draftCustom }));
        return;
      }

      const res = await fetch("/api/plantings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-roseiies-studio-token": token,
        },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : null;

      if (!res.ok) {
        console.error("Create planting failed:", { status: res.status, data, payload });
        setRows((prev) => prev.filter((r) => r.id !== tempId));
        setDraftRow(nextDraft);
        setCustomCells((prev) => ({ ...prev, __new__: draftCustom }));
        return;
      }

      const created = data as PlantingRow;
      setRows((prev) => prev.map((r) => (r.id === tempId ? created : r)));

      if (draftCustom && Object.keys(draftCustom).length) {
        setCustomCells((prev) => ({
          ...prev,
          [created.id]: draftCustom,
        }));
      }
    } catch (e) {
      console.error("Create planting failed (network/exception):", e);
      setRows((prev) => prev.filter((r) => r.id !== tempId));
      setDraftRow(nextDraft);
      setCustomCells((prev) => ({ ...prev, __new__: draftCustom }));
    }
  }

  function addColumnInline() {
    const key = `field_${Math.random().toString(16).slice(2)}`;
    const newCol: Column = { key, label: "New field", type: "text", width: 180 };
    setCols((prev) => [...prev, newCol]);
    setRenaming({ colKey: key });
    setRenameDraft("New field");
  }

  function beginRename(colKey: string, currentLabel: string) {
    setRenaming({ colKey });
    setRenameDraft(currentLabel);
  }

  function commitRename() {
    if (!renaming) return;
    const { colKey } = renaming;
    const name = renameDraft.trim();
    if (!name) {
      setRenaming(null);
      setRenameDraft("");
      return;
    }

    setCols((prev) => prev.map((c) => (String(c.key) === colKey ? { ...c, label: name } : c)));
    setRenaming(null);
    setRenameDraft("");
  }

  function setColumnType(colKey: string, type: ColType) {
    setCols((prev) =>
      prev.map((c) => {
        if (String(c.key) !== colKey) return c;
        const next: Column = { ...c, type };
        if (type === "select" && !next.options) next.options = { values: [] };
        if (type !== "select") delete next.options;
        return next;
      })
    );
  }

  function setSelectOptions(colKey: string, values: string[]) {
    setCols((prev) => prev.map((c) => (String(c.key) === colKey ? { ...c, options: { values } } : c)));
  }

  function renderCellDisplay(rowId: string, col: Column, row: PlantingRow | null) {
    const key = String(col.key);

    if (key === "bed_id") {
      const raw = rowId === "__new__" ? (draftRow as any).bed_id : row?.bed_id ?? null;
      const text = raw ? bedLabel(raw) : "";
      return text ? <span className="text-black/80 truncate">{text}</span> : <span className="text-black/30">—</span>;
    }

    if (key === "pin_x") {
      const rx = rowId === "__new__" ? draftRow.pin_x : row?.pin_x ?? null;
      const ry = rowId === "__new__" ? draftRow.pin_y : row?.pin_y ?? null;
      const v = rx != null && ry != null ? "✅" : "—";
      return <span className="text-black/70">{v}</span>;
    }

    const v = getCellValue(rowId, key, row);

    if (col.type === "attachment") {
      const list: AttachmentItem[] = Array.isArray(v) ? v : [];
      if (!list.length) return <span className="text-black/30">+ Add</span>;
      return (
        <div className="flex items-center gap-2 overflow-hidden">
          {list.slice(0, 3).map((a, i) => (
            <img
              key={`${a.name}_${i}`}
              src={a.dataUrl}
              alt={a.name}
              className="h-7 w-7 rounded-md border border-black/10 object-cover"
            />
          ))}
          {list.length > 3 ? <span className="text-xs text-black/45">+{list.length - 3}</span> : null}
        </div>
      );
    }

    if (col.type === "checkbox") {
      return <span className="text-black/70">{v ? "✓" : <span className="text-black/30">—</span>}</span>;
    }

    if (v == null || v === "") return <span className="text-black/30">—</span>;
    return <span className="text-black/80 truncate">{String(v)}</span>;
  }

  function renderCellEditor(rowId: string, col: Column, row: PlantingRow | null) {
    const key = String(col.key);

    if (key === "pin_x") return <div className="text-black/50">—</div>;

    if (col.type === "select" && key === "bed_id") {
      return (
        <select
          autoFocus
          value={String(draft ?? "")}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => commitEdit()}
          className="w-full rounded-md border border-black/10 bg-white px-2 py-1 text-sm"
        >
          <option value="">—</option>
          {beds.map((b: any) => (
            <option key={b.id} value={b.id}>
              {b.label}
            </option>
          ))}
        </select>
      );
    }

    if (col.type === "select") {
      const options = col.options?.values ?? [];
      return (
        <select
          autoFocus
          value={String(draft ?? "")}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => commitEdit()}
          className="w-full rounded-md border border-black/10 bg-white px-2 py-1 text-sm"
        >
          <option value="">—</option>
          {options.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      );
    }

    if (col.type === "date") {
      return (
        <input
          autoFocus
          type="date"
          value={String(draft ?? "")}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => commitEdit()}
          className="w-full rounded-md border border-black/10 bg-white px-2 py-1 text-sm"
        />
      );
    }

    if (col.type === "checkbox") {
      return (
        <label className="flex items-center gap-2">
          <input
            autoFocus
            type="checkbox"
            checked={Boolean(draft)}
            onChange={(e) => setDraft(e.target.checked)}
            onBlur={() => commitEdit()}
          />
          <span className="text-sm text-black/70"> </span>
        </label>
      );
    }

    if (col.type === "attachment") {
      return <AttachmentEditor value={Array.isArray(draft) ? draft : []} onChange={(n) => setDraft(n)} onDone={() => commitEdit()} />;
    }

    const inputType = col.type === "number" ? "number" : "text";
    return (
      <input
        autoFocus
        type={inputType}
        value={draft == null ? "" : String(draft)}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => commitEdit()}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commitEdit({ move: "down" });
          }
          if (e.key === "Tab") {
            e.preventDefault();
            commitEdit({ move: e.shiftKey ? "left" : "right" });
          }
          if (e.key === "Escape") {
            e.preventDefault();
            stopEdit();
          }
        }}
        className="w-full rounded-md border border-black/10 bg-white px-2 py-1 text-sm"
      />
    );
  }

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const el = e.target as HTMLElement | null;
      if (!el) return;
      if (el.closest?.("[data-col-popover]")) return;
      setColConfig(null);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const displayRows = useMemo(() => {
    const out: Array<{ id: string; row: PlantingRow | null; isDraft: boolean }> = rows.map((r) => ({
      id: r.id,
      row: r,
      isDraft: false,
    }));
    out.push({ id: "__new__", row: null, isDraft: true });
    return out;
  }, [rows]);

  return (
    <div className="w-full" ref={gridRef}>
      <div className="sticky top-0 z-10 mb-3 flex items-center justify-between gap-3 bg-white/70 backdrop-blur py-2">
        <div className="min-w-0">
          <div className="text-xs text-black/45">Garden Data</div>
          <div className="text-sm font-semibold text-black/75 truncate">
            {activeGarden?.name ?? "—"}
          </div>
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          {/* Optional: keep a small “Map” link, but subtle */}
          {onGoDesign ? (
            <button
              onClick={onGoDesign}
              className="rounded-lg border border-black/10 bg-white/60 px-3 py-2 text-sm backdrop-blur hover:bg-white/80"
              title="Open Map"
            >
              Map
            </button>
          ) : null}
      
          <button
            onClick={addColumnInline}
            className="rounded-lg border border-black/10 bg-white/60 px-3 py-2 text-sm backdrop-blur hover:bg-white/80"
            title="Add a column"
          >
            + Column
          </button>
        
          <button
            onClick={refresh}
            className="rounded-lg border border-black/10 bg-white/60 px-3 py-2 text-sm backdrop-blur hover:bg-white/80"
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>
        
      

      <div className="rounded-xl border border-black/10 bg-white/55 backdrop-blur shadow-sm overflow-hidden">
        <div className="flex border-b border-black/10 bg-white/70">
          {cols.map((c) => {
            const key = String(c.key);
            const isRenaming = renaming?.colKey === key;

            return (
              <div
                key={key}
                className="relative px-3 py-2 text-xs font-semibold text-black/70 border-r border-black/10 last:border-r-0"
                style={{ width: c.width ?? 180 }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    {isRenaming ? (
                      <input
                        autoFocus
                        value={renameDraft}
                        onChange={(e) => setRenameDraft(e.target.value)}
                        onBlur={commitRename}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitRename();
                          if (e.key === "Escape") {
                            setRenaming(null);
                            setRenameDraft("");
                          }
                        }}
                        className="w-full rounded-md border border-black/10 bg-white px-2 py-1 text-xs font-semibold text-black/80"
                      />
                    ) : (
                      <button
                        className="max-w-full truncate text-left hover:underline"
                        onClick={() => beginRename(key, c.label)}
                        title="Rename column"
                      >
                        {c.label}
                      </button>
                    )}

                    <div className="mt-0.5 text-[10px] font-medium text-black/40 uppercase tracking-wide">
                      {c.type}
                    </div>
                  </div>

                  <button
                    onClick={() => setColConfig((prev) => (prev?.colKey === key ? null : { colKey: key }))}
                    className="shrink-0 rounded-md border border-black/10 bg-white/70 px-2 py-1 text-[11px] text-black/60 hover:bg-white"
                    title="Column settings"
                    data-col-popover
                  >
                    ⋯
                  </button>
                </div>

                {colConfig?.colKey === key ? (
                  <div className="absolute right-2 top-11 z-20 w-56 rounded-xl border border-black/10 bg-white shadow-lg p-3" data-col-popover>
                    <div className="text-[11px] font-semibold text-black/65">Column type</div>

                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {(["text", "number", "date", "checkbox", "select", "attachment"] as ColType[]).map((t) => (
                        <button
                          key={t}
                          onClick={() => setColumnType(key, t)}
                          className={`rounded-lg border px-2 py-1 text-xs transition ${
                            c.type === t
                              ? "border-black/20 bg-black/5 text-black/80"
                              : "border-black/10 bg-white text-black/70 hover:bg-black/5"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>

                    {cols.find((x) => String(x.key) === key)?.type === "select" ? (
                      <div className="mt-3">
                        <div className="text-[11px] font-semibold text-black/65">
                          Options (comma-separated)
                        </div>
                        <input
                          className="mt-2 w-full rounded-lg border border-black/10 bg-white px-2 py-1 text-xs"
                          defaultValue={(c.options?.values ?? []).join(", ")}
                          onBlur={(e) => {
                            const raw = e.target.value;
                            const values = raw
                              .split(",")
                              .map((s) => s.trim())
                              .filter(Boolean);
                            setSelectOptions(key, values);
                          }}
                        />
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}

          <button
            onClick={addColumnInline}
            className="px-3 py-2 text-xs font-semibold text-black/55 hover:text-black/80"
            style={{ width: 54 }}
            title="Add column"
          >
            +
          </button>
        </div>

        <div className="max-h-[70vh] overflow-auto">
          {rows.length === 0 ? (
            <div className="p-6">
              {beds.length === 0 ? (
                <div className="rounded-xl border border-black/10 bg-white/60 p-5">
                  <div className="text-sm font-semibold text-black/75">
                    Design precedes data
                  </div>
                  <div className="mt-1 text-sm text-black/55">
                    You don’t have any beds yet. Start in <span className="font-medium">Design</span>,
                    create beds and zones, then log plantings here.
                  </div>
                  {onGoDesign ? (
                    <button
                      onClick={onGoDesign}
                      className="rounded-lg border border-black/10 bg-white/60 px-3 py-2 text-sm backdrop-blur hover:bg-white/80"
                      title="Open Designer"
                    >
                      Open Designer →
                    </button>
                  ) : null}  
                </div>
              ) : (
                <div className="rounded-xl border border-black/10 bg-white/60 p-5">
                  <div className="text-sm font-semibold text-black/75">No plantings yet</div>
                  <div className="mt-1 text-sm text-black/55">
                    Beds exist, but nothing has been logged. Double-click cells to add values.
                    Tip: “Bed” connects each planting back to the map.
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {displayRows.map(({ id, row, isDraft }) => (
            <div key={id} className={`flex border-b border-black/5 last:border-b-0 ${isDraft ? "bg-white/40" : ""}`}>
              {cols.map((c) => {
                const key = String(c.key);
                const isEditing = editing?.rowId === id && editing?.colKey === key;

                const initial =
                  key === "bed_id"
                    ? id === "__new__"
                      ? draftRow.bed_id ?? ""
                      : (row as any)?.bed_id ?? ""
                    : getCellValue(id, key, row);

                return (
                  <div
                    key={`${id}_${key}`}
                    className="px-3 py-2 text-sm border-r border-black/5 last:border-r-0 cursor-text"
                    style={{ width: c.width ?? 180 }}
                    onClick={() => {
                      if (key === "pin_x") return;
                      startEdit(id, key, initial ?? "");
                      if (c.type === "attachment") {
                        const curr = getCellValue(id, key, row);
                        setDraft(Array.isArray(curr) ? curr : []);
                      }
                    }}
                  >
                    {isEditing ? renderCellEditor(id, c, row) : <div className="truncate">{renderCellDisplay(id, c, row)}</div>}
                  </div>
                );
              })}

              {isDraft ? <div className="px-3 py-2 text-xs text-black/35">New record</div> : null}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-2 text-xs text-black/45">
        Tip: Click a cell to edit. Type in the last row to create a new planting. “Bed” maps plantings to Designer regions.
      </div>
    </div>
  );
}

function AttachmentEditor({
  value,
  onChange,
  onDone,
}: {
  value: AttachmentItem[];
  onChange: (next: AttachmentItem[]) => void;
  onDone: () => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  async function onPick(files: FileList | null) {
    if (!files || !files.length) return;

    const next: AttachmentItem[] = [];
    for (const f of Array.from(files)) {
      const dataUrl = await fileToDataUrl(f);
      next.push({ name: f.name, dataUrl });
    }

    onChange([...(value ?? []), ...next]);
  }

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => onPick(e.target.files)}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="rounded-md border border-black/10 bg-white px-2 py-1 text-xs text-black/70 hover:bg-black/5"
      >
        Upload
      </button>

      <button
        type="button"
        onClick={() => onDone()}
        className="rounded-md border border-black/10 bg-black/5 px-2 py-1 text-xs text-black/70 hover:bg-black/10"
      >
        Done
      </button>

      {value?.length ? (
        <button
          type="button"
          onClick={() => onChange([])}
          className="ml-auto rounded-md border border-black/10 bg-white px-2 py-1 text-xs text-black/55 hover:bg-black/5"
          title="Remove attachments"
        >
          Clear
        </button>
      ) : null}
    </div>
  );
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result ?? ""));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
