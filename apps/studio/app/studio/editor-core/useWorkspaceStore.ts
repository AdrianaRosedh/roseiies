"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  ItemType,
  LayoutDoc,
  StudioItem,
  StudioModule,
  WorkspaceStore,
  PlantBlock,
} from "./types";
import type { PublishResult } from "./TopBar";

const BASE_STORAGE_KEY = "roseiies:studio:workspace:v1";

function storageKey(tenantId?: string) {
  return tenantId ? `${BASE_STORAGE_KEY}:${tenantId}` : BASE_STORAGE_KEY;
}

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

// ✅ Tree SVG variants live in apps/studio/public/images/trees/
const TREE_VARIANTS = ["tree-01", "tree-02", "tree-03", "tree-04", "citrus"] as const;

function pickTreeVariant() {
  return TREE_VARIANTS[Math.floor(Math.random() * TREE_VARIANTS.length)];
}

function seedStore(module: StudioModule): WorkspaceStore {
  const g1 = { id: "olivea_garden_main", name: "Huerto Principal" };
  const l1 = {
    id: "layout_winter_2026",
    gardenId: g1.id,
    name: "Winter 2026",
    published: true,
    updatedAt: new Date().toISOString(),
  };

  const doc: LayoutDoc = {
    version: 1,
    canvas: module.defaults.canvas,
    items: [],
  };

  return {
    version: 1,
    gardens: [g1],
    layouts: [l1],
    docs: { [l1.id]: doc },
    activeGardenId: g1.id,
    activeLayoutId: l1.id,
  };
}

function loadStore(module: StudioModule, key: string): WorkspaceStore {
  if (typeof window === "undefined") return seedStore(module);
  const raw = window.localStorage.getItem(key);
  if (!raw) return seedStore(module);
  try {
    const parsed = JSON.parse(raw) as WorkspaceStore;
    if (!parsed || parsed.version !== 1) return seedStore(module);
    return parsed;
  } catch {
    return seedStore(module);
  }
}

function saveStore(state: WorkspaceStore, key: string) {
  window.localStorage.setItem(key, JSON.stringify(state));
}

function emptyDoc(module: StudioModule): LayoutDoc {
  return { version: 1, canvas: module.defaults.canvas, items: [] };
}

function isEditableTarget(el: EventTarget | null) {
  if (!el || !(el instanceof HTMLElement)) return false;
  const tag = el.tagName.toLowerCase();
  return (
    tag === "input" ||
    tag === "textarea" ||
    tag === "select" ||
    el.isContentEditable
  );
}

export function useWorkspaceStore(
  module: StudioModule,
  opts?: { tenantId?: string }
) {
  const key = storageKey(opts?.tenantId);

  const [mounted, setMounted] = useState(false);
  const [state, setState] = useState<WorkspaceStore>(() => seedStore(module));

  useEffect(() => {
    setState(loadStore(module, key));
    setMounted(true);
  }, [module, key]);

  useEffect(() => {
    if (!mounted) return;
    saveStore(state, key);
  }, [state, mounted, key]);

  const [tool, setTool] = useState<ItemType>("bed");

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [stageScale, setStageScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 40, y: 40 });

  const [panMode, setPanMode] = useState(false);

  const cursorWorldRef = useRef<{ x: number; y: number } | null>(null);
  const viewportCenterWorldRef = useRef<{ x: number; y: number } | null>(null);

  const [clipboard, setClipboard] = useState<StudioItem[] | null>(null);

  const doc = useMemo(() => {
    const id = state.activeLayoutId;
    if (!id) return emptyDoc(module);
    return state.docs[id] ?? emptyDoc(module);
  }, [state, module]);

  const selected = useMemo(() => {
    if (selectedIds.length === 0) return null;
    return doc.items.find((i) => i.id === selectedIds[0]) ?? null;
  }, [doc.items, selectedIds]);

  const selectedItems = useMemo(() => {
    if (selectedIds.length === 0) return [];
    const set = new Set(selectedIds);
    return doc.items.filter((i) => set.has(i.id));
  }, [doc.items, selectedIds]);

  function updateDoc(patch: Partial<LayoutDoc>) {
    const layoutId = state.activeLayoutId;
    if (!layoutId) return;

    setState((prev) => ({
      ...prev,
      docs: {
        ...prev.docs,
        [layoutId]: {
          ...(prev.docs[layoutId] ?? emptyDoc(module)),
          ...patch,
        } as LayoutDoc,
      },
      layouts: prev.layouts.map((l) =>
        l.id === layoutId ? { ...l, updatedAt: new Date().toISOString() } : l
      ),
    }));
  }

  function updateItem(id: string, patch: Partial<StudioItem>) {
    updateDoc({
      items: doc.items.map((it) => (it.id === id ? { ...it, ...patch } : it)),
    });
  }

  function updateMeta(id: string, patch: Partial<StudioItem["meta"]>) {
    updateDoc({
      items: doc.items.map((it) =>
        it.id === id ? { ...it, meta: { ...it.meta, ...patch } } : it
      ),
    });
  }

  function updateStyle(id: string, patch: Partial<StudioItem["style"]>) {
    updateDoc({
      items: doc.items.map((it) =>
        it.id === id ? { ...it, style: { ...it.style, ...patch } } : it
      ),
    });
  }

  function setActiveGarden(gardenId: string) {
    const firstLayout = state.layouts.find((l) => l.gardenId === gardenId) ?? null;
    setState((prev) => ({
      ...prev,
      activeGardenId: gardenId,
      activeLayoutId: firstLayout?.id ?? null,
    }));
    setSelectedIds([]);
  }

  function setActiveLayout(layoutId: string) {
    setState((prev) => ({ ...prev, activeLayoutId: layoutId }));
    setSelectedIds([]);
  }

  // ✅ No prompt: name is provided by UI (TopBar)
  function newGarden(name: string) {
    const g = { id: uid("garden"), name };
    const l = {
      id: uid("layout"),
      gardenId: g.id,
      name: "Layout 1",
      published: false,
      updatedAt: new Date().toISOString(),
    };

    setState((prev) => ({
      ...prev,
      gardens: [...prev.gardens, g],
      layouts: [...prev.layouts, l],
      docs: { ...prev.docs, [l.id]: emptyDoc(module) },
      activeGardenId: g.id,
      activeLayoutId: l.id,
    }));
    setSelectedIds([]);
  }

  function renameGarden(name: string) {
    const active = state.gardens.find((g) => g.id === state.activeGardenId);
    if (!active) return;
    setState((prev) => ({
      ...prev,
      gardens: prev.gardens.map((g) => (g.id === active.id ? { ...g, name } : g)),
    }));
  }

  function newLayout(name: string) {
    if (!state.activeGardenId) return;

    const l = {
      id: uid("layout"),
      gardenId: state.activeGardenId,
      name,
      published: false,
      updatedAt: new Date().toISOString(),
    };

    setState((prev) => ({
      ...prev,
      layouts: [...prev.layouts, l],
      docs: { ...prev.docs, [l.id]: emptyDoc(module) },
      activeLayoutId: l.id,
    }));

    setSelectedIds([]);
  }

  function renameLayout(name: string) {
    const active = state.layouts.find((l) => l.id === state.activeLayoutId);
    if (!active) return;
    setState((prev) => ({
      ...prev,
      layouts: prev.layouts.map((l) => (l.id === active.id ? { ...l, name } : l)),
    }));
  }

  async function publishLayout(tenantId?: string): Promise<PublishResult> {
    const activeLayout = state.layouts.find((l) => l.id === state.activeLayoutId);
    const activeGarden = state.gardens.find((g) => g.id === state.activeGardenId);

    if (!activeLayout || !activeGarden) return { ok: false, error: "No active garden/layout" };
    if (!tenantId) return { ok: false, error: "Missing tenantId" };

    const res = await fetch("/api/publish-garden-layout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenantId,
        gardenName: activeGarden.name,
        layoutName: activeLayout.name,
        doc,
      }),
    });

    const json = await res.json();
    if (!res.ok) return { ok: false, error: json?.error ?? "unknown error" };

    // Update local state so the ● indicator updates immediately
    setState((prev) => ({
      ...prev,
      layouts: prev.layouts.map((l) => {
        if (l.gardenId !== activeLayout.gardenId) return l;
        const isPublished = l.id === activeLayout.id;
        return {
          ...l,
          published: isPublished,
          updatedAt: isPublished ? new Date().toISOString() : l.updatedAt,
        };
      }),
    }));

    return { ok: true, itemsWritten: json.itemsWritten };
  }

  function deleteSelected() {
    if (selectedIds.length === 0) return;
    const set = new Set(selectedIds);
    updateDoc({ items: doc.items.filter((i) => !set.has(i.id)) });
    setSelectedIds([]);
  }

  function resetView() {
    setStageScale(1);
    setStagePos({ x: 40, y: 40 });
  }

  function addItemAtWorld(args: { type: ItemType; x: number; y: number }) {
    const baseStyle = module.defaults.stylesByType[args.type];
    const maxOrder = doc.items.reduce((m, it) => Math.max(m, it.order ?? 0), 0);

    const w =
      args.type === "path" ? 240 :
      args.type === "label" ? 220 :
      args.type === "tree" ? 120 :
      200;

    const h =
      args.type === "path" ? 28 :
      args.type === "label" ? 44 :
      args.type === "tree" ? 120 :
      120;

    const label =
      args.type === "bed"
        ? "Bed"
        : args.type === "tree"
          ? "Tree"
          : args.type === "zone"
            ? "Zone"
            : args.type === "path"
              ? "Path"
              : args.type === "structure"
                ? "Structure"
                : "Label";

    const item: StudioItem = {
      id: uid(args.type),
      type: args.type,
      x: args.x,
      y: args.y,
      w,
      h,
      r: 0,
      order: maxOrder + 1,
      label,
      meta: {
        status: args.type === "bed" ? "dormant" : undefined,
        public: args.type === "bed" ? false : undefined,
        plants: args.type === "bed" ? [] : undefined,

        tree:
          args.type === "tree"
            ? {
                species: "Tree",
                canopyM: 3,
                variant: pickTreeVariant(),
              }
            : undefined,
      },
      style: {
        ...baseStyle,
        shadow: baseStyle.shadow ? { ...baseStyle.shadow } : undefined,
      },
    };

    updateDoc({ items: [...doc.items, item] });
    setSelectedIds([item.id]);
  }

  function setCursorWorld(pos: { x: number; y: number } | null) {
    cursorWorldRef.current = pos;
  }
  function setViewportCenterWorld(pos: { x: number; y: number } | null) {
    viewportCenterWorldRef.current = pos;
  }

  function quickInsert(type: ItemType) {
    const center = viewportCenterWorldRef.current;
    const x = center ? center.x - 90 : 200;
    const y = center ? center.y - 60 : 200;
    addItemAtWorld({ type, x, y });
  }

  function copySelected() {
    if (selectedItems.length === 0) return;
    setClipboard(
      selectedItems.map((it) => ({
        ...it,
        meta: {
          ...it.meta,
          plants: it.meta.plants ? [...it.meta.plants] : it.meta.plants,
        },
        style: {
          ...it.style,
          shadow: it.style.shadow ? { ...it.style.shadow } : undefined,
        },
      }))
    );
  }

  function pasteAtCursor() {
    if (!clipboard || clipboard.length === 0) return;

    const pos = cursorWorldRef.current;
    const anchor = pos ?? viewportCenterWorldRef.current ?? { x: 240, y: 240 };

    const minX = Math.min(...clipboard.map((i) => i.x));
    const minY = Math.min(...clipboard.map((i) => i.y));
    const maxX = Math.max(...clipboard.map((i) => i.x + i.w));
    const maxY = Math.max(...clipboard.map((i) => i.y + i.h));

    const groupW = maxX - minX;
    const groupH = maxY - minY;

    const targetX = anchor.x - groupW / 2;
    const targetY = anchor.y - groupH / 2;

    const dx = targetX - minX;
    const dy = targetY - minY;

    const pasted = clipboard.map((it) => ({
      ...it,
      id: uid(it.type),
      x: it.x + dx,
      y: it.y + dy,
      meta: {
        ...it.meta,
        plants: it.meta.plants ? [...it.meta.plants] : it.meta.plants,
      },
      style: {
        ...it.style,
        shadow: it.style.shadow ? { ...it.style.shadow } : undefined,
      },
    }));

    updateDoc({ items: [...doc.items, ...pasted] });
    setSelectedIds(pasted.map((p) => p.id));
  }

  function addPlantToBed(bedId: string) {
    const bed = doc.items.find((i) => i.id === bedId);
    if (!bed) return;
    const plants = bed.meta.plants ?? [];
    const p: PlantBlock = { id: uid("plant"), name: "Plant", color: "#5e7658" };
    updateMeta(bedId, { plants: [...plants, p] });
  }

  function updatePlant(bedId: string, plantId: string, patch: Partial<PlantBlock>) {
    const bed = doc.items.find((i) => i.id === bedId);
    if (!bed) return;
    const plants = bed.meta.plants ?? [];
    updateMeta(bedId, {
      plants: plants.map((p) => (p.id === plantId ? { ...p, ...patch } : p)),
    });
  }

  function removePlant(bedId: string, plantId: string) {
    const bed = doc.items.find((i) => i.id === bedId);
    if (!bed) return;
    const plants = bed.meta.plants ?? [];
    updateMeta(bedId, { plants: plants.filter((p) => p.id !== plantId) });
  }

  // Keyboard shortcuts
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (isEditableTarget(e.target)) return;

      if (e.key === " ") {
        e.preventDefault();
        setPanMode(true);
        return;
      }

      if (e.key === "Escape") {
        setPanMode(false);
        setSelectedIds([]);
        return;
      }

      if (e.key === "Backspace" || e.key === "Delete") {
        if (selectedIds.length) deleteSelected();
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
        copySelected();
        pasteAtCursor();
      }
    }

    function onKeyUp(e: KeyboardEvent) {
      if (e.key === " ") {
        e.preventDefault();
        setPanMode(false);
      }
    }

    function onBlur() {
      setPanMode(false);
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds, selectedItems, clipboard]);

  return {
    mounted,
    module,
    state,
    emptyDoc: () => emptyDoc(module),

    tool,
    setTool,

    selectedIds,
    setSelectedIds,
    selected,
    selectedItems,

    panMode,

    stageScale,
    setStageScale,
    stagePos,
    setStagePos,

    clipboard,

    updateDoc,
    updateItem,
    updateMeta,
    updateStyle,

    setCursorWorld,
    setViewportCenterWorld,
    quickInsert,
    addItemAtWorld,

    addPlantToBed,
    updatePlant,
    removePlant,

    setActiveGarden,
    setActiveLayout,

    newGarden,
    renameGarden,
    newLayout,
    renameLayout,
    publishLayout,

    resetView,
    copySelected,
    pasteAtCursor,
    deleteSelected,
  };
}