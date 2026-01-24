// apps/studio/app/studio/editor-core/canvas/item/hooks/useKonvaCache.ts

import { useEffect, useRef } from "react";
import type Konva from "konva";
import type { StudioItem } from "../../../types";

export function useKonvaCache(args: {
  groupRef: React.RefObject<Konva.Group | null>;
  item: StudioItem;
  selected: boolean;
  hovered: boolean;
  editMode: string;
  panMode: boolean;
  stageScale: number;
}) {
  const { groupRef, item, selected, hovered, editMode, panMode, stageScale } = args;
  const cacheRafRef = useRef<number | null>(null);

  useEffect(() => {
    const g = groupRef.current;
    if (!g) return;

    const canCache = !selected && !hovered && editMode === "none" && !panMode;

    const pxW = item.w * stageScale;
    const pxH = item.h * stageScale;
    const pxArea = pxW * pxH;

    const CACHE_AREA_MAX = 1.2e6; // ~1.2 MP
    const shouldCache = canCache && pxArea > 0 && pxArea < CACHE_AREA_MAX;

    if (cacheRafRef.current != null) {
      cancelAnimationFrame(cacheRafRef.current);
      cacheRafRef.current = null;
    }

    cacheRafRef.current = requestAnimationFrame(() => {
      cacheRafRef.current = null;
      try {
        if (shouldCache) {
          if (!g.isCached()) {
            g.cache({ pixelRatio: 1 });
            g.getLayer()?.batchDraw();
          }
        } else {
          if (g.isCached()) {
            g.clearCache();
            g.getLayer()?.batchDraw();
          }
        }
      } catch {
        // ignore cache errors (rare mid-destroy)
      }
    });

    return () => {
      if (cacheRafRef.current != null) cancelAnimationFrame(cacheRafRef.current);
    };
  }, [groupRef, item.w, item.h, stageScale, selected, hovered, editMode, panMode]);
}
