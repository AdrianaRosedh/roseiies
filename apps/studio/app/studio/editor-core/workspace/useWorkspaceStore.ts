// apps/studio/app/studio/editor-core/workspace/useWorkspaceStore.ts
"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  ItemType,
  LayoutDoc,
  StudioItem,
  StudioModule,
  WorkspaceStore,
} from "../types";

import { storageKey } from "./utils/storage";
import { emptyDoc } from "./utils/doc";
import { isEditableTarget } from "./utils/dom";

import { getActiveDoc, getSelectedItem, getSelectedItems } from "./selectors";

import { useWorkspacePersistence } from "./hooks/useWorkspacePersistence";
import { useWorkspaceHistory } from "./hooks/useWorkspaceHistory";
import { useWorkspaceClipboard } from "./hooks/useWorkspaceClipboard";
import { useWorkspaceCommands } from "./hooks/useWorkspaceCommands";

import type { WorkspaceUIState } from "./types";

export const TREE_VARIANTS = ["tree-01", "tree-02", "tree-03", "tree-04", "citrus"] as const;
export type TreeVariant = (typeof TREE_VARIANTS)[number];

export function useWorkspaceStore(module: StudioModule, opts?: { tenantId?: string }) {
  const key = storageKey(opts?.tenantId);

  // persistence
  const { mounted, state, setState } = useWorkspacePersistence({ module, storageKey: key });

  // ui state (local; split later)
  const [ui, setUI] = useState<WorkspaceUIState>({
    tool: "bed",
    selectedIds: [],
    stageScale: 1,
    stagePos: { x: 40, y: 40 },
    panMode: false,
    treeVariant: "tree-01",
    selectionVersion: 0,
  });

  // derived view aliases (back-compat for existing UI)
  const tool = ui.tool;
  const selectedIds = ui.selectedIds;
  const stageScale = ui.stageScale;
  const stagePos = ui.stagePos;
  const panMode = ui.panMode;

  // derived doc + selection
  const doc = useMemo(() => getActiveDoc(state, module), [state, module]);
  const selected = useMemo(() => getSelectedItem(doc, selectedIds), [doc, selectedIds]);
  const selectedItems = useMemo(() => getSelectedItems(doc, selectedIds), [doc, selectedIds]);

  function setSelectedIds(next: string[]) {
    setUI((prev) => ({ ...prev, selectedIds: next }));
  }

  // history (undo/redo)
  const history = useWorkspaceHistory({
    module,
    state,
    setState,
    onAfterRestore: () => {
      setUI((prev) => ({
        ...prev,
        selectedIds: [],
        selectionVersion: prev.selectionVersion + 1,
      }));
    },
  });

  // core doc patching primitive (creates history snapshot)
  function updateDoc(patch: Partial<LayoutDoc>) {
    const layoutId = state.activeLayoutId;
    if (!layoutId) return;

    history.pushSnapshot(doc);

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

  // alias expected by some parts of the UI
  const updateLayoutDoc = updateDoc;

  // item patch primitive (batch)
  function updateItemsBatch(patches: Array<{ id: string; patch: Partial<StudioItem> }>) {
    const layoutId = state.activeLayoutId;
    if (!layoutId) return;
    if (!patches.length) return;

    history.pushSnapshot(doc);

    const selectedSet = new Set(selectedIds);
    const touchesSelection = patches.some((p) => selectedSet.has(p.id));
    const map = new Map(patches.map((p) => [p.id, p.patch]));

    setState((prev) => {
      const baseDoc = (prev.docs[layoutId] ?? emptyDoc(module)) as LayoutDoc;

      const nextItems = baseDoc.items.map((it) => {
        const patch = map.get(it.id);
        if (!patch) return it;

        const next: StudioItem = { ...it, ...patch } as any;

        if ((patch as any).meta) next.meta = { ...it.meta, ...(patch as any).meta };
        if ((patch as any).style) next.style = { ...it.style, ...(patch as any).style };

        return next;
      });

      return {
        ...prev,
        docs: { ...prev.docs, [layoutId]: { ...baseDoc, items: nextItems } },
        layouts: prev.layouts.map((l) =>
          l.id === layoutId ? { ...l, updatedAt: new Date().toISOString() } : l
        ),
      };
    });

    if (touchesSelection) {
      setUI((prev) => ({ ...prev, selectionVersion: prev.selectionVersion + 1 }));
    }
  }

  function updateItem(id: string, patch: Partial<StudioItem>) {
    updateItemsBatch([{ id, patch }]);
  }
  function updateMeta(id: string, patch: Partial<StudioItem["meta"]>) {
    updateItemsBatch([{ id, patch: { meta: patch as any } as any }]);
  }
  function updateStyle(id: string, patch: Partial<StudioItem["style"]>) {
    updateItemsBatch([{ id, patch: { style: patch as any } as any }]);
  }

  // commands (layout/garden + adding items etc)
  const commands = useWorkspaceCommands({
    module,
    state,
    setState,
    doc,
    ui,
    setUI,
    updateDoc,
    updateItemsBatch,
    setSelectedIds,
  });

  // clipboard (copy/paste + cursor/viewport refs)
  const clip = useWorkspaceClipboard({
    module,
    doc,
    state,
    updateDoc,
    selectedItems,
    setSelectedIds,
  });

  // keyboard shortcuts (extract later)
  useEffect(() => {
    function isEditableTarget(t: EventTarget | null) {
      const el = t as HTMLElement | null;
      if (!el) return false;
      const tag = el.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return true;
      if ((el as any).isContentEditable) return true;
      return false;
    }
    
    function onKeyDown(e: KeyboardEvent) {
      if (isEditableTarget(e.target)) return;
      if (e.defaultPrevented) return;

      const isMod = e.metaKey || e.ctrlKey;

      // undo/redo
      if (isMod && (e.key === "z" || e.key === "Z")) {
        e.preventDefault();
        if (e.shiftKey) history.redo();
        else history.undo();
        return;
      }
      if (isMod && (e.key === "y" || e.key === "Y")) {
        e.preventDefault();
        history.redo();
        return;
      }

      // pan mode (space)
      if (e.key === " ") {
        e.preventDefault();
        setUI((prev) => ({ ...prev, panMode: true }));
        return;
      }

      // escape clears selection + pan
      if (e.key === "Escape") {
        setUI((prev) => ({ ...prev, panMode: false, selectedIds: [] }));
        return;
      }

      // delete
      if (e.key === "Backspace" || e.key === "Delete") {
        if (selectedIds.length) commands.deleteSelected();
        return;
      }

      // copy/paste/duplicate
      if (isMod && (e.key === "c" || e.key === "C")) {
        e.preventDefault();
        clip.copySelected();
        return;
      }
      if (isMod && (e.key === "v" || e.key === "V")) {
        e.preventDefault();
        clip.pasteAtCursor();
        return;
      }
      if (isMod && (e.key === "d" || e.key === "D")) {
        e.preventDefault();
        clip.copySelected();
        clip.pasteAtCursor();
        return;
      }
    }

    function onKeyUp(e: KeyboardEvent) {
      if (e.key === " ") {
        e.preventDefault();
        setUI((prev) => ({ ...prev, panMode: false }));
      }
    }

    function onBlur() {
      setUI((prev) => ({ ...prev, panMode: false }));
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
  }, [selectedIds, state.activeLayoutId, doc]);

  // public store API (keeps existing consumers working)
  return {
    mounted,
    module,
    state,
    emptyDoc: () => emptyDoc(module),

    tool,
    setTool: (t: ItemType) => setUI((prev) => ({ ...prev, tool: t })),

    selectedIds,
    setSelectedIds,
    selected,
    selectedItems,

    panMode,

    stageScale,
    setStageScale: (v: number) => setUI((prev) => ({ ...prev, stageScale: v })),
    stagePos,
    setStagePos: (p: { x: number; y: number }) => setUI((prev) => ({ ...prev, stagePos: p })),

    // keep back-compat shape used by canvas & shell
    selectionVersion: ui.selectionVersion,

    clipboard: clip.clipboard,

    updateDoc,
    updateLayoutDoc,

    updateItem,
    updateItemsBatch,
    updateMeta,
    updateStyle,

    treeVariant: ui.treeVariant as TreeVariant,
    setTreeVariant: (v: TreeVariant) => setUI((prev) => ({ ...prev, treeVariant: v })),

    setCursorWorld: clip.setCursorWorld,
    setViewportCenterWorld: clip.setViewportCenterWorld,

    // commands
    addItemAtWorld: commands.addItemAtWorld,
    deleteSelected: commands.deleteSelected,

    setActiveGarden: commands.setActiveGarden,
    setActiveLayout: commands.setActiveLayout,

    newGarden: commands.newGarden,
    renameGarden: commands.renameGarden,
    newLayout: commands.newLayout,
    renameLayout: commands.renameLayout,
    publishLayout: commands.publishLayout,

    resetView: commands.resetView,

    // clipboard convenience
    copySelected: clip.copySelected,
    pasteAtCursor: clip.pasteAtCursor,

    // history
    undo: history.undo,
    redo: history.redo,
  };
}
