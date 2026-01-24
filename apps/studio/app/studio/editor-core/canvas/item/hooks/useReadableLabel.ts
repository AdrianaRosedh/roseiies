// apps/studio/app/studio/editor-core/canvas/item/hooks/useReadableLabel.ts

import { useCallback, useEffect, useRef } from "react";
import type Konva from "konva";

export function useReadableLabel(args: {
  groupRef: React.RefObject<Konva.Group | null>;
  textRef: React.RefObject<Konva.Text | null>;
}) {
  const { groupRef, textRef } = args;
  const labelRafRef = useRef<number | null>(null);

  const keepLabelReadableRaf = useCallback(() => {
    if (labelRafRef.current != null) return;

    labelRafRef.current = requestAnimationFrame(() => {
      labelRafRef.current = null;

      const g = groupRef.current;
      const t = textRef.current;
      if (!g || !t) return;

      const sx = g.scaleX();
      const sy = g.scaleY();

      if (Math.abs(sx) > 1e-6) t.scaleX(1 / sx);
      if (Math.abs(sy) > 1e-6) t.scaleY(1 / sy);

      t.rotation(-g.rotation());
    });
  }, [groupRef, textRef]);

  useEffect(() => {
    return () => {
      if (labelRafRef.current != null) cancelAnimationFrame(labelRafRef.current);
    };
  }, []);

  return keepLabelReadableRaf;
}
