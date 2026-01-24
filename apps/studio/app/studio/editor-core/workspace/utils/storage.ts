// apps/studio/app/studio/editor-core/workspace/utils/storage.ts

import type { WorkspaceStore } from "../../types";
import type { StudioModule } from "../../types";

const BASE_STORAGE_KEY = "roseiies:studio:workspace:v1";

export function storageKey(tenantId?: string) {
  return tenantId ? `${BASE_STORAGE_KEY}:${tenantId}` : BASE_STORAGE_KEY;
}

// ✅ Generic seed: no Olivea hard-coding
export function seedStore(module: StudioModule): WorkspaceStore {
  const g1 = { id: "garden_1", name: "Garden 1" };
  const l1 = {
    id: "layout_1",
    gardenId: g1.id,
    name: "Layout 1",
    published: false,
    updatedAt: new Date().toISOString(),
  };

  return {
    version: 1,
    gardens: [g1],
    layouts: [l1],
    docs: {
      [l1.id]: {
        version: 1,
        canvas: module.defaults.canvas,
        items: [],
      },
    },
    activeGardenId: g1.id,
    activeLayoutId: l1.id,
  };
}

export function loadStore(module: StudioModule, key: string): WorkspaceStore {
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

export function saveStore(state: WorkspaceStore, key: string) {
  window.localStorage.setItem(key, JSON.stringify(state));
}
