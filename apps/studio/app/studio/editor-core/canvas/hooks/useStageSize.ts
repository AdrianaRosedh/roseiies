// apps/studio/app/studio/editor-core/canvas/hooks/useStageSize.ts
"use client";

import { useEffect, useState } from "react";

export type StageSize = {
  w: number;
  h: number;
};

export default function useStageSize(
  wrapRef: React.RefObject<HTMLDivElement | null>
): StageSize {
  const [stageSize, setStageSize] = useState<StageSize>({
    w: 900,
    h: 600,
  });

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    // Initial measurement (important on first render)
    const r0 = el.getBoundingClientRect();
    setStageSize({
      w: Math.max(320, Math.floor(r0.width)),
      h: Math.max(320, Math.floor(r0.height)),
    });

    // Observe future resizes
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;

      const { width, height } = entry.contentRect;

      setStageSize({
        w: Math.max(320, Math.floor(width)),
        h: Math.max(320, Math.floor(height)),
      });
    });

    ro.observe(el);

    return () => {
      ro.disconnect();
    };
  }, [wrapRef]);

  return stageSize;
}