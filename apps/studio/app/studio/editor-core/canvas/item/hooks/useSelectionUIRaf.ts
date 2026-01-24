// apps/studio/app/studio/editor-core/canvas/item/hooks/useSelectionUIRaf.ts

import { useCallback, useEffect, useRef } from "react";

export function useSelectionUIRaf(onSelectionUI: () => void) {
  const selRafRef = useRef<number | null>(null);

  const selectionUIRaf = useCallback(() => {
    if (selRafRef.current != null) return;
    selRafRef.current = requestAnimationFrame(() => {
      selRafRef.current = null;
      onSelectionUI();
    });
  }, [onSelectionUI]);

  useEffect(() => {
    return () => {
      if (selRafRef.current != null) cancelAnimationFrame(selRafRef.current);
    };
  }, []);

  return selectionUIRaf;
}
