// apps/studio/app/studio/editor-core/workspace/hooks/useWorkspacePersistence.ts

import { useEffect, useState } from "react";
import type { StudioModule, WorkspaceStore } from "../../types";
import { loadStore, saveStore, seedStore } from "../utils/storage";

export function useWorkspacePersistence(args: {
  module: StudioModule;
  storageKey: string;
}) {
  const { module, storageKey } = args;

  const [mounted, setMounted] = useState(false);
  const [state, setState] = useState<WorkspaceStore>(() => seedStore(module));

  useEffect(() => {
    setState(loadStore(module, storageKey));
    setMounted(true);
  }, [module, storageKey]);

  // ✅ PERF: debounce localStorage writes
  useEffect(() => {
    if (!mounted) return;
    const t = window.setTimeout(() => saveStore(state, storageKey), 250);
    return () => window.clearTimeout(t);
  }, [state, mounted, storageKey]);

  return { mounted, state, setState } as const;
}
