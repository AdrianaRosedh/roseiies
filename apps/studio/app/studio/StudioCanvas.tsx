"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Stage, Layer, Rect, Text, Transformer } from "react-konva";
import type Konva from "konva";

type ItemType = "bed" | "zone" | "path" | "structure" | "label";

type Item = {
  id: string;
  type: ItemType;
  x: number;
  y: number;
  w: number;
  h: number;
  r: number;
  label: string;
  meta: {
    status?: "abundant" | "fragile" | "dormant";
    public?: boolean;
  };
};

type LayoutDoc = {
  version: 1;
  canvas: { width: number; height: number };
  items: Item[];
};

type Garden = { id: string; name: string };

type Layout = {
  id: string;
  gardenId: string;
  name: string;
  published: boolean;
  updatedAt: string;
};

type Store = {
  version: 1;
  gardens: Garden[];
  layouts: Layout[];
  docs: Record<string, LayoutDoc>;
  activeGardenId: string | null;
  activeLayoutId: string | null;
};

const STORAGE_KEY = "roseiies:studio:gardenLayouts:v1";

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function emptyDoc(): LayoutDoc {
  return { version: 1, canvas: { width: 1600, height: 1000 }, items: [] };
}

function seedStore(): Store {
  const g1: Garden = { id: "olivea_garden_main", name: "Huerto Principal" };
  const l1: Layout = {
    id: "layout_winter_2026",
    gardenId: g1.id,
    name: "Winter 2026",
    published: true,
    updatedAt: new Date().toISOString(),
  };

  return {
    version: 1,
    gardens: [g1],
    layouts: [l1],
    docs: { [l1.id]: emptyDoc() },
    activeGardenId: g1.id,
    activeLayoutId: l1.id,
  };
}

function loadStore(): Store {
  if (typeof window === "undefined") return seedStore();
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return seedStore();
  try {
    const parsed = JSON.parse(raw) as Store;
    if (!parsed || parsed.version !== 1) return seedStore();
    return parsed;
  } catch {
    return seedStore();
  }
}

function saveStore(store: Store) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function defaultItem(type: ItemType, x: number, y: number): Item {
  const base: Item = {
    id: uid(type),
    type,
    x,
    y,
    w: type === "path" ? 240 : 190,
    h: type === "path" ? 28 : 120,
    r: 0,
    label:
      type === "bed"
        ? "Bed"
        : type === "zone"
          ? "Zone"
          : type === "path"
            ? "Path"
            : type === "structure"
              ? "Structure"
              : "Label",
    meta: {
      status: type === "bed" ? "dormant" : undefined,
      public: type === "bed" ? false : undefined,
    },
  };

  if (type === "label") {
    base.w = 180;
    base.h = 44;
  }

  return base;
}

/** Light Roseiies palette for canvas objects */
function fillFor(item: Item) {
  if (item.type === "bed") {
    if (item.meta.status === "abundant") return "rgba(94,118,88,0.22)";
    if (item.meta.status === "fragile") return "rgba(245,158,11,0.18)";
    return "rgba(15,23,42,0.07)";
  }
  if (item.type === "zone") return "rgba(37,99,235,0.08)";
  if (item.type === "path") return "rgba(2,6,23,0.06)";
  if (item.type === "structure") return "rgba(168,85,247,0.10)";
  return "rgba(2,6,23,0.05)";
}

function strokeFor(selected: boolean) {
  return selected ? "rgba(15,23,42,0.65)" : "rgba(15,23,42,0.22)";
}

function labelColor() {
  return "rgba(15,23,42,0.92)";
}

function btn(kind: "ghost" | "primary" | "danger") {
  if (kind === "primary") {
    return "rounded-lg border border-black/10 bg-[rgba(94,118,88,0.18)] px-3 py-2 text-xs text-black shadow-sm hover:bg-[rgba(94,118,88,0.24)]";
  }
  if (kind === "danger") {
    return "rounded-lg border border-black/10 bg-red-500/10 px-3 py-2 text-xs text-red-700 shadow-sm hover:bg-red-500/15 disabled:opacity-50";
  }
  return "rounded-lg border border-black/10 bg-white px-3 py-2 text-xs text-black/80 shadow-sm hover:bg-black/5 disabled:opacity-50";
}

function ToolButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-2xl border px-4 py-3 text-left text-sm transition shadow-sm ${
        active
          ? "border-black/15 bg-black/5"
          : "border-black/10 bg-white hover:bg-black/5"
      }`}
    >
      {label}
    </button>
  );
}

function isEditableTarget(el: EventTarget | null) {
  if (!el || !(el instanceof HTMLElement)) return false;
  const tag = el.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || el.isContentEditable;
}

export default function StudioCanvas() {
  // Hydration-safe init
  const [mounted, setMounted] = useState(false);
  const [store, setStore] = useState<Store>(() => seedStore());

  useEffect(() => {
    setStore(loadStore());
    setMounted(true);
  }, []);

  // Auto-save store
  useEffect(() => {
    if (!mounted) return;
    saveStore(store);
  }, [store, mounted]);

  // UI
  const [tool, setTool] = useState<ItemType>("bed");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panMode, setPanMode] = useState(false);

  // Clipboard (for copy/paste)
  const [clipboard, setClipboard] = useState<Item | null>(null);

  // Stage sizing (smooth) via ResizeObserver
  const canvasWrapRef = useRef<HTMLDivElement | null>(null);
  const [stageSize, setStageSize] = useState({ w: 900, h: 600 });

  useEffect(() => {
    const el = canvasWrapRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setStageSize({ w: Math.max(320, Math.floor(r.width)), h: Math.max(320, Math.floor(r.height)) });
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Pan/zoom
  const [stageScale, setStageScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 40, y: 40 });

  const stageRef = useRef<Konva.Stage>(null);
  const trRef = useRef<Konva.Transformer>(null);

  const [selectedNode, setSelectedNode] = useState<Konva.Rect | null>(null);

  // Cursor world position (for cursor paste)
  const cursorWorldRef = useRef<{ x: number; y: number } | null>(null);

  // Bind transformer when selection changes
  useEffect(() => {
    const tr = trRef.current;
    if (!tr) return;
    tr.nodes(selectedNode ? [selectedNode] : []);
    tr.getLayer()?.batchDraw();
  }, [selectedNode]);

  // Derivations
  const activeGarden = useMemo(
    () => store.gardens.find((g) => g.id === store.activeGardenId) ?? null,
    [store]
  );

  const layoutsForGarden = useMemo(() => {
    if (!store.activeGardenId) return [];
    return store.layouts
      .filter((l) => l.gardenId === store.activeGardenId)
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  }, [store]);

  const activeLayout = useMemo(
    () => store.layouts.find((l) => l.id === store.activeLayoutId) ?? null,
    [store]
  );

  const doc = useMemo(() => {
    const id = store.activeLayoutId;
    if (!id) return emptyDoc();
    return store.docs[id] ?? emptyDoc();
  }, [store]);

  const selected = useMemo(
    () => doc.items.find((i) => i.id === selectedId) ?? null,
    [doc.items, selectedId]
  );

  // Helpers
  function updateStore(patch: Partial<Store>) {
    setStore((prev) => ({ ...prev, ...patch }));
  }

  function setActiveGarden(gardenId: string) {
    const firstLayout = store.layouts.find((l) => l.gardenId === gardenId) ?? null;
    updateStore({
      activeGardenId: gardenId,
      activeLayoutId: firstLayout?.id ?? null,
    });
    setSelectedId(null);
    setSelectedNode(null);
  }

  function setActiveLayout(layoutId: string) {
    updateStore({ activeLayoutId: layoutId });
    setSelectedId(null);
    setSelectedNode(null);
  }

  function updateDoc(patch: Partial<LayoutDoc>) {
    const layoutId = store.activeLayoutId;
    if (!layoutId) return;

    setStore((prev) => ({
      ...prev,
      docs: {
        ...prev.docs,
        [layoutId]: { ...(prev.docs[layoutId] ?? emptyDoc()), ...patch } as LayoutDoc,
      },
      layouts: prev.layouts.map((l) =>
        l.id === layoutId ? { ...l, updatedAt: new Date().toISOString() } : l
      ),
    }));
  }

  function updateItem(id: string, patch: Partial<Item>) {
    updateDoc({
      items: doc.items.map((it) => (it.id === id ? { ...it, ...patch } : it)),
    });
  }

  function updateMeta(id: string, patch: Partial<Item["meta"]>) {
    updateDoc({
      items: doc.items.map((it) =>
        it.id === id ? { ...it, meta: { ...it.meta, ...patch } } : it
      ),
    });
  }

  function deleteSelected() {
    if (!selectedId) return;
    updateDoc({ items: doc.items.filter((i) => i.id !== selectedId) });
    setSelectedId(null);
    setSelectedNode(null);
  }

  function newGarden() {
    const name = window.prompt("New garden name (e.g., Invernadero):");
    if (!name) return;

    const g: Garden = { id: uid("garden"), name };
    const l: Layout = {
      id: uid("layout"),
      gardenId: g.id,
      name: "Layout 1",
      published: false,
      updatedAt: new Date().toISOString(),
    };

    setStore((prev) => ({
      ...prev,
      gardens: [...prev.gardens, g],
      layouts: [...prev.layouts, l],
      docs: { ...prev.docs, [l.id]: emptyDoc() },
      activeGardenId: g.id,
      activeLayoutId: l.id,
    }));

    setSelectedId(null);
    setSelectedNode(null);
  }

  function renameGarden() {
    if (!activeGarden) return;
    const name = window.prompt("Garden name:", activeGarden.name);
    if (!name) return;

    setStore((prev) => ({
      ...prev,
      gardens: prev.gardens.map((g) => (g.id === activeGarden.id ? { ...g, name } : g)),
    }));
  }

  function newLayout() {
    if (!store.activeGardenId) return;
    const name = window.prompt("Layout name (e.g., Spring 2026):", "Layout");
    if (!name) return;

    const l: Layout = {
      id: uid("layout"),
      gardenId: store.activeGardenId,
      name,
      published: false,
      updatedAt: new Date().toISOString(),
    };

    setStore((prev) => ({
      ...prev,
      layouts: [...prev.layouts, l],
      docs: { ...prev.docs, [l.id]: emptyDoc() },
      activeLayoutId: l.id,
    }));

    setSelectedId(null);
    setSelectedNode(null);
  }

  function renameLayout() {
    if (!activeLayout) return;
    const name = window.prompt("Layout name:", activeLayout.name);
    if (!name) return;

    setStore((prev) => ({
      ...prev,
      layouts: prev.layouts.map((l) => (l.id === activeLayout.id ? { ...l, name } : l)),
    }));
  }

  function publishLayout() {
    if (!activeLayout) return;
    setStore((prev) => ({
      ...prev,
      layouts: prev.layouts.map((l) =>
        l.gardenId === activeLayout.gardenId
          ? { ...l, published: l.id === activeLayout.id }
          : l
      ),
    }));
    toast("Published (local). Next: publish to Supabase → tenant updates live.");
  }

  function resetView() {
    setStageScale(1);
    setStagePos({ x: 40, y: 40 });
  }

  function worldFromPointer(pointer: { x: number; y: number }) {
    return {
      x: (pointer.x - stagePos.x) / stageScale,
      y: (pointer.y - stagePos.y) / stageScale,
    };
  }

  function copySelected() {
    if (!selected) return;
    // deep-ish copy
    setClipboard({
      ...selected,
      id: selected.id, // preserved in clipboard; new id created on paste
      meta: { ...selected.meta },
    });
    toast("Copied");
  }

  function pasteAtCursor() {
    if (!clipboard) return;

    const pos = cursorWorldRef.current;
    const base = clipboard;

    const x = pos ? pos.x - base.w / 2 : base.x + 24;
    const y = pos ? pos.y - base.h / 2 : base.y + 24;

    const pasted: Item = {
      ...base,
      id: uid(base.type),
      x,
      y,
      meta: { ...base.meta },
    };

    updateDoc({ items: [...doc.items, pasted] });
    setSelectedId(pasted.id);
    toast("Pasted");
  }

  function duplicateSelected() {
    if (!selected) return;
    setClipboard({
      ...selected,
      id: selected.id,
      meta: { ...selected.meta },
    });
    pasteAtCursor();
  }

  // Keyboard shortcuts
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (isEditableTarget(e.target)) return;

      // Spacebar pan mode
      if (e.key === " ") {
        e.preventDefault();
        setPanMode(true);
        return;
      }

      // Escape deselect
      if (e.key === "Escape") {
        setSelectedId(null);
        setSelectedNode(null);
        return;
      }

      // Delete
      if (e.key === "Backspace" || e.key === "Delete") {
        if (selectedId) deleteSelected();
        return;
      }

      const isMod = e.metaKey || e.ctrlKey;

      if (isMod && (e.key === "c" || e.key === "C")) {
        e.preventDefault();
        copySelected();
      }

      if (isMod && (e.key === "v" || e.key === "V")) {
        e.preventDefault();
        pasteAtCursor();
      }

      if (isMod && (e.key === "d" || e.key === "D")) {
        e.preventDefault();
        duplicateSelected();
      }
    }

    function onKeyUp(e: KeyboardEvent) {
      if (e.key === " ") {
        e.preventDefault();
        setPanMode(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clipboard, selectedId, selected]);

  function onWheel(e: any) {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    const oldScale = stageScale;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const scaleBy = 1.04;
    const direction = e.evt.deltaY > 0 ? -1 : 1;
    let newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;

    // Clamp for smoothness
    newScale = Math.min(2.6, Math.max(0.35, newScale));

    const mousePointTo = {
      x: (pointer.x - stagePos.x) / oldScale,
      y: (pointer.y - stagePos.y) / oldScale,
    };

    setStageScale(newScale);

    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };

    setStagePos(newPos);
  }

  function onStageMouseDown(e: any) {
    const clickedOnEmpty = e.target === e.target.getStage();
    if (clickedOnEmpty) {
      setSelectedId(null);
      setSelectedNode(null);
    }
  }

  function onStageDoubleClick() {
    if (!store.activeLayoutId) return;

    const stage = stageRef.current;
    if (!stage) return;

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const world = worldFromPointer(pointer);
    const item = defaultItem(tool, world.x - 90, world.y - 60);

    updateDoc({ items: [...doc.items, item] });
    setSelectedId(item.id);
  }

  function onStageMouseMove() {
    const stage = stageRef.current;
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    cursorWorldRef.current = worldFromPointer(pointer);
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#fbfbfb] text-black flex items-center justify-center">
        <div className="text-xs text-black/60">Loading Roseiies Studio…</div>
      </div>
    );
  }

  return (
    <div className="grid h-screen grid-rows-[56px_1fr] bg-[#fbfbfb] text-black">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-black/10 bg-white/70 backdrop-blur px-4">
        <div className="flex items-center gap-3">
          <div className="text-sm font-semibold tracking-tight">Roseiies Studio</div>

          <span className="mx-2 h-5 w-px bg-black/10" />

          {/* Garden */}
          <div className="flex items-center gap-2">
            <select
              value={store.activeGardenId ?? ""}
              onChange={(e) => setActiveGarden(e.target.value)}
              className="rounded-lg border border-black/10 bg-white px-3 py-2 text-xs shadow-sm"
            >
              {store.gardens.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>

            <button className={btn("ghost")} onClick={renameGarden} disabled={!activeGarden}>
              Rename
            </button>

            <button className={btn("ghost")} onClick={newGarden}>
              + Garden
            </button>
          </div>

          {/* Layout */}
          <div className="ml-3 flex items-center gap-2">
            <select
              value={store.activeLayoutId ?? ""}
              onChange={(e) => setActiveLayout(e.target.value)}
              className="rounded-lg border border-black/10 bg-white px-3 py-2 text-xs shadow-sm"
            >
              {layoutsForGarden.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.published ? "● " : ""}
                  {l.name}
                </option>
              ))}
            </select>

            <button className={btn("ghost")} onClick={renameLayout} disabled={!activeLayout}>
              Rename
            </button>

            <button className={btn("ghost")} onClick={newLayout} disabled={!store.activeGardenId}>
              + Layout
            </button>

            <button className={btn("primary")} onClick={publishLayout} disabled={!activeLayout}>
              Publish
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full border border-black/10 bg-white px-3 py-2 text-xs text-black/70 shadow-sm">
            Zoom: {Math.round(stageScale * 100)}%
          </span>

          <span className="rounded-full border border-black/10 bg-white px-3 py-2 text-xs text-black/70 shadow-sm">
            {panMode ? "Pan: ON (space)" : "Pan: hold space"}
          </span>

          <button className={btn("ghost")} onClick={resetView}>
            Reset
          </button>

          <button className={btn("ghost")} onClick={copySelected} disabled={!selectedId}>
            Copy
          </button>

          <button className={btn("ghost")} onClick={pasteAtCursor} disabled={!clipboard}>
            Paste
          </button>

          <button className={btn("danger")} onClick={deleteSelected} disabled={!selectedId}>
            Delete
          </button>
        </div>
      </header>

      {/* Main */}
      <div className="grid grid-cols-[280px_1fr_360px]">
        {/* Tools */}
        <aside className="border-r border-black/10 bg-white/60 p-4">
          <div className="text-xs text-black/55">
            Double-click to drop · Scroll to zoom · Hold space to pan · Cmd/Ctrl+C/V/D
          </div>

          <div className="mt-5 space-y-2">
            <ToolButton label="Bed" active={tool === "bed"} onClick={() => setTool("bed")} />
            <ToolButton label="Zone" active={tool === "zone"} onClick={() => setTool("zone")} />
            <ToolButton label="Path" active={tool === "path"} onClick={() => setTool("path")} />
            <ToolButton label="Structure" active={tool === "structure"} onClick={() => setTool("structure")} />
            <ToolButton label="Label" active={tool === "label"} onClick={() => setTool("label")} />
          </div>

          <div className="mt-6 rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
            <div className="text-xs text-black/60">Tips</div>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-black/55">
              <li>Paste places the item under your cursor.</li>
              <li>Resize with handles, rotate with top handle.</li>
              <li>Hold space to pan (Miro-style).</li>
            </ul>
          </div>
        </aside>

        {/* Canvas */}
        <section className="relative bg-[#fbfbfb]" ref={canvasWrapRef}>
          <div className="absolute left-4 top-4 z-10 rounded-full border border-black/10 bg-white/80 px-3 py-2 text-xs text-black/70 shadow-sm backdrop-blur">
            Tool: <span className="font-semibold text-black">{tool}</span> · Items:{" "}
            <span className="font-semibold text-black">{doc.items.length}</span>
          </div>

          <Stage
            ref={stageRef}
            width={stageSize.w}
            height={stageSize.h}
            draggable={panMode}
            x={stagePos.x}
            y={stagePos.y}
            scaleX={stageScale}
            scaleY={stageScale}
            onDragEnd={(e) => setStagePos({ x: e.target.x(), y: e.target.y() })}
            onWheel={onWheel}
            onMouseDown={onStageMouseDown}
            onDblClick={onStageDoubleClick}
            onMouseMove={onStageMouseMove}
          >
            <Layer>
              <Rect
                x={0}
                y={0}
                width={doc.canvas.width}
                height={doc.canvas.height}
                fill="rgba(255,255,255,0.92)"
                stroke="rgba(2,6,23,0.08)"
                strokeWidth={2}
                cornerRadius={18}
              />

              {doc.items.map((item) => (
                <ItemNode
                  key={item.id}
                  item={item}
                  selected={item.id === selectedId}
                  panMode={panMode}
                  onSelect={() => setSelectedId(item.id)}
                  onSelectNode={(node) => setSelectedNode(node)}
                  onChange={(patch) => updateItem(item.id, patch)}
                />
              ))}

              <Transformer
                ref={trRef}
                rotateEnabled
                keepRatio={false}
                enabledAnchors={[
                  "top-left",
                  "top-right",
                  "bottom-left",
                  "bottom-right",
                  "middle-left",
                  "middle-right",
                  "top-center",
                  "bottom-center",
                ]}
                borderStroke="rgba(15,23,42,0.55)"
                anchorStroke="rgba(15,23,42,0.55)"
                anchorFill="rgba(255,255,255,0.95)"
                anchorSize={10}
                boundBoxFunc={(oldBox, newBox) => {
                  if (newBox.width < 24 || newBox.height < 24) return oldBox;
                  return newBox;
                }}
              />
            </Layer>
          </Stage>
        </section>

        {/* Inspector */}
        <aside className="border-l border-black/10 bg-white/60 p-4">
          <div className="text-sm font-semibold tracking-tight">Inspector</div>
          <div className="mt-1 text-xs text-black/55">Select an item to edit.</div>

          {!selected ? (
            <div className="mt-6 rounded-2xl border border-black/10 bg-white p-4 text-sm text-black/60 shadow-sm">
              No selection.
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
                <div className="text-xs text-black/55">Type</div>
                <div className="mt-1 text-sm font-medium">{selected.type}</div>

                <div className="mt-4 text-xs text-black/55">Label</div>
                <input
                  value={selected.label}
                  onChange={(e) => updateItem(selected.id, { label: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm shadow-sm"
                />

                <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-black/55">
                  <div>
                    X: <span className="text-black/80">{Math.round(selected.x)}</span>
                  </div>
                  <div>
                    Y: <span className="text-black/80">{Math.round(selected.y)}</span>
                  </div>
                  <div>
                    W: <span className="text-black/80">{Math.round(selected.w)}</span>
                  </div>
                  <div>
                    H: <span className="text-black/80">{Math.round(selected.h)}</span>
                  </div>
                </div>
              </div>

              {selected.type === "bed" ? (
                <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
                  <div className="text-xs text-black/55">Status</div>
                  <select
                    value={selected.meta.status ?? "dormant"}
                    onChange={(e) => updateMeta(selected.id, { status: e.target.value as any })}
                    className="mt-2 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm shadow-sm"
                  >
                    <option value="abundant">abundant</option>
                    <option value="fragile">fragile</option>
                    <option value="dormant">dormant</option>
                  </select>

                  <label className="mt-4 flex items-center justify-between gap-3 text-sm">
                    <span className="text-xs text-black/55">Public</span>
                    <input
                      type="checkbox"
                      checked={!!selected.meta.public}
                      onChange={(e) => updateMeta(selected.id, { public: e.target.checked })}
                    />
                  </label>
                </div>
              ) : null}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function ItemNode({
  item,
  selected,
  panMode,
  onSelect,
  onSelectNode,
  onChange,
}: {
  item: Item;
  selected: boolean;
  panMode: boolean;
  onSelect: () => void;
  onSelectNode: (node: Konva.Rect | null) => void;
  onChange: (patch: Partial<Item>) => void;
}) {
  const shapeRef = useRef<Konva.Rect>(null);

  useEffect(() => {
    if (selected) onSelectNode(shapeRef.current);
    else onSelectNode(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  return (
    <>
      <Rect
        ref={shapeRef}
        x={item.x}
        y={item.y}
        width={item.w}
        height={item.h}
        rotation={item.r}
        fill={fillFor(item)}
        stroke={strokeFor(selected)}
        strokeWidth={selected ? 2.25 : 1.1}
        cornerRadius={14}
        draggable={!panMode}
        onClick={() => {
          onSelect();
        }}
        onTap={() => {
          onSelect();
        }}
        onDragEnd={(e) => onChange({ x: e.target.x(), y: e.target.y() })}
        onTransformEnd={(e) => {
          const node = e.target as Konva.Rect;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();

          node.scaleX(1);
          node.scaleY(1);

          onChange({
            x: node.x(),
            y: node.y(),
            w: Math.max(24, node.width() * scaleX),
            h: Math.max(24, node.height() * scaleY),
            r: node.rotation(),
          });
        }}
      />

      <Text
        x={item.x + 12}
        y={item.y + 10}
        text={item.label}
        fontSize={14}
        fill={labelColor()}
        listening={false}
      />
    </>
  );
}

function toast(message: string) {
  // Minimal toast for now
  // (we’ll replace with a real toast system later)
  // eslint-disable-next-line no-alert
  alert(message);
}