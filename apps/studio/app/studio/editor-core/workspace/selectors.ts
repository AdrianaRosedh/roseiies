// apps/studio/app/studio/editor-core/workspace/selectors.ts

import type { LayoutDoc, StudioItem, StudioModule, WorkspaceStore } from "../types";
import { emptyDoc } from "./utils/doc";

export function getActiveDoc(state: WorkspaceStore, module: StudioModule): LayoutDoc {
  const id = state.activeLayoutId;
  if (!id) return emptyDoc(module);
  return state.docs[id] ?? emptyDoc(module);
}

export function getSelectedItem(doc: LayoutDoc, selectedIds: string[]) {
  if (selectedIds.length === 0) return null;
  return doc.items.find((i) => i.id === selectedIds[0]) ?? null;
}

export function getSelectedItems(doc: LayoutDoc, selectedIds: string[]): StudioItem[] {
  if (selectedIds.length === 0) return [];
  const set = new Set(selectedIds);
  return doc.items.filter((i) => set.has(i.id));
}
