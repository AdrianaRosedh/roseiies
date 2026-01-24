// apps/studio/app/studio/editor-core/workspace/hooks/useWorkspaceHistory.ts

import { useEffect, useRef } from "react";
import type { LayoutDoc, StudioModule, WorkspaceStore } from "../../types";
import { cloneDoc, emptyDoc } from "../utils/doc";

const MAX_HISTORY = 80;

type HistoryStack = {
  layoutId: string | null;
  past: LayoutDoc[];
  future: LayoutDoc[];
};

export function useWorkspaceHistory(args: {
  module: StudioModule;
  state: WorkspaceStore;
  setState: React.Dispatch<React.SetStateAction<WorkspaceStore>>;
  onAfterRestore?: () => void;
}) {
  const { module, state, setState, onAfterRestore } = args;

  const historyRef = useRef<HistoryStack>({ layoutId: null, past: [], future: [] });

  // Reset history when layout changes (safe default)
  useEffect(() => {
    const layoutId = state.activeLayoutId ?? null;
    const h = historyRef.current;
    if (h.layoutId !== layoutId) {
      historyRef.current = { layoutId, past: [], future: [] };
    }
  }, [state.activeLayoutId]);

  function pushSnapshot(currentDoc: LayoutDoc) {
    const layoutId = state.activeLayoutId;
    if (!layoutId) return;

    const h = historyRef.current;
    if (h.layoutId !== layoutId) {
      historyRef.current = { layoutId, past: [], future: [] };
    }

    h.past.push(cloneDoc(currentDoc));
    if (h.past.length > MAX_HISTORY) h.past.splice(0, h.past.length - MAX_HISTORY);

    // new change invalidates redo stack
    h.future = [];
  }

  function undo() {
    const layoutId = state.activeLayoutId;
    if (!layoutId) return;

    const h = historyRef.current;
    if (h.layoutId !== layoutId) return;
    if (h.past.length === 0) return;

    const prevDoc = h.past.pop()!;
    const currentDoc = state.docs[layoutId] ?? emptyDoc(module);

    h.future.push(cloneDoc(currentDoc));
    if (h.future.length > MAX_HISTORY) h.future.splice(0, h.future.length - MAX_HISTORY);

    setState((prev) => ({
      ...prev,
      docs: { ...prev.docs, [layoutId]: prevDoc },
      layouts: prev.layouts.map((l) =>
        l.id === layoutId ? { ...l, updatedAt: new Date().toISOString() } : l
      ),
    }));

    onAfterRestore?.();
  }

  function redo() {
    const layoutId = state.activeLayoutId;
    if (!layoutId) return;

    const h = historyRef.current;
    if (h.layoutId !== layoutId) return;
    if (h.future.length === 0) return;

    const nextDoc = h.future.pop()!;
    const currentDoc = state.docs[layoutId] ?? emptyDoc(module);

    h.past.push(cloneDoc(currentDoc));
    if (h.past.length > MAX_HISTORY) h.past.splice(0, h.past.length - MAX_HISTORY);

    setState((prev) => ({
      ...prev,
      docs: { ...prev.docs, [layoutId]: nextDoc },
      layouts: prev.layouts.map((l) =>
        l.id === layoutId ? { ...l, updatedAt: new Date().toISOString() } : l
      ),
    }));

    onAfterRestore?.();
  }

  return { pushSnapshot, undo, redo } as const;
}
