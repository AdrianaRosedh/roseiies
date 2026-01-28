// apps/studio/app/studio/editor-core/workspace/hooks/useWorkspaceCommands.ts

import type { ItemType, LayoutDoc, PlantBlock, StudioItem, WorkspaceStore } from "../../types";
import type { PortalContext } from "../../../../lib/portal/getPortalContext";
import type { PublishResult } from "../../TopBar";
import type { WorkspaceCommands, WorkspaceCommandsDeps } from "../types";

import { emptyDoc } from "../utils/doc";
import { uid } from "../utils/ids";
import { ensureItemCode } from "../utils/itemCodes";

export function useWorkspaceCommands(deps: WorkspaceCommandsDeps): WorkspaceCommands {
  const { module, state, setState, doc, ui, setUI, updateDoc, updateItemsBatch, setSelectedIds } =
    deps;

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

    const areaName = "Garden";

    const studioToken = process.env.NEXT_PUBLIC_ROSEIIES_STUDIO_TOKEN;

    const res = await fetch("/api/publish-garden-layout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(studioToken ? { "x-roseiies-studio-token": studioToken } : {}),
      },
      body: JSON.stringify({
        workplaceSlug: tenantId, // ✅ tenantId is acting as workplaceSlug right now
        areaName,
        layoutName: activeLayout.name,
        doc,
      }),
    });

    const json = await res.json();
    if (!res.ok) return { ok: false, error: json?.error ?? "unknown error" };

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

    return {
      ok: true,
      itemsWritten: json.itemsWritten ?? json.assetsWritten ?? 0,
      viewUrl: json.viewUrl ?? (json?.layoutId ? `/view/${json.layoutId}` : undefined),
      layoutId: json.layoutId ?? json?.layout?.id ?? undefined,
    };
  }

  function resetView() {
    setUI((prev) => ({ ...prev, stageScale: 1, stagePos: { x: 40, y: 40 } }));
  }

  function addItemAtWorld(args: { type: ItemType; x: number; y: number }) {
    const baseStyle = module.defaults.stylesByType[args.type];
    const maxOrder = doc.items.reduce((m, it) => Math.max(m, it.order ?? 0), 0);

    const w =
      args.type === "path" ? 240 :
      args.type === "label" ? 220 :
      args.type === "tree" ? 170 : 200;

    const h =
      args.type === "path" ? 28 :
      args.type === "label" ? 44 :
      args.type === "tree" ? 170 : 200;

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

    const code = ensureItemCode({ itemsContext: doc.items, type: args.type });

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
        code,
        status: args.type === "bed" ? "dormant" : undefined,
        public: args.type === "bed" ? false : undefined,
        plants: args.type === "bed" ? [] : undefined,
        tree:
          args.type === "tree"
            ? { species: "Tree", canopyM: 3, variant: ui.treeVariant }
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

  function deleteSelected() {
    if (ui.selectedIds.length === 0) return;
    const set = new Set(ui.selectedIds);
    updateDoc({ items: doc.items.filter((i) => !set.has(i.id)) });
    setSelectedIds([]);
  }

  function addPlantToBed(bedId: string) {
    const bed = doc.items.find((i) => i.id === bedId);
    if (!bed) return;
    const plants = bed.meta.plants ?? [];
    const p: PlantBlock = { id: uid("plant"), name: "Plant", color: "#5e7658" };
    updateItemsBatch([{ id: bedId, patch: { meta: { plants: [...plants, p] } as any } as any }]);
  }

  function updatePlant(bedId: string, plantId: string, patch: Partial<PlantBlock>) {
    const bed = doc.items.find((i) => i.id === bedId);
    if (!bed) return;
    const plants = bed.meta.plants ?? [];
    const next = plants.map((p) => (p.id === plantId ? { ...p, ...patch } : p));
    updateItemsBatch([{ id: bedId, patch: { meta: { plants: next } as any } as any }]);
  }

  function removePlant(bedId: string, plantId: string) {
    const bed = doc.items.find((i) => i.id === bedId);
    if (!bed) return;
    const plants = bed.meta.plants ?? [];
    const next = plants.filter((p) => p.id !== plantId);
    updateItemsBatch([{ id: bedId, patch: { meta: { plants: next } as any } as any }]);
  }

  return {
    setActiveGarden,
    setActiveLayout,
    newGarden,
    renameGarden,
    newLayout,
    renameLayout,
    publishLayout,
    resetView,
    addItemAtWorld,
    deleteSelected,
    addPlantToBed,
    updatePlant,
    removePlant,
  };
}
