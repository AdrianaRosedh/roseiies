// apps/studio/app/studio/editor-core/canvas/item/hooks/useKonvaCache.ts

import { useEffect, useMemo, useRef } from "react";
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

  // Optional: don’t cache until required assets exist (soil pattern / tree image)
  assetsReady?: boolean;

  // Optional: bump to force recache when assets become ready
  cacheKey?: string;
}) {
  const {
    groupRef,
    item,
    selected,
    hovered,
    editMode,
    panMode,
    stageScale,
    assetsReady = true,
    cacheKey = "",
  } = args;

  const rafRef = useRef<number | null>(null);
  const lastKeyRef = useRef<string>("");

  // ✅ Cache only when zoomed OUT (perf mode). When zoomed IN, keep crisp.
  // Tune: you can move this threshold up/down.
  const allowCacheAtThisZoom = stageScale <= 1.15;

  const shouldCache = useMemo(() => {
    if (!assetsReady) return false;
    if (!allowCacheAtThisZoom) return false;

    if (selected) return false;
    if (hovered) return false;
    if (panMode) return false;
    if (editMode !== "none") return false;

    // Avoid caching massive nodes (memory/perf)
    const pxW = item.w * stageScale;
    const pxH = item.h * stageScale;
    const pxArea = pxW * pxH;
    const CACHE_AREA_MAX = 1.2e6; // ~1.2MP
    if (!(pxArea > 0 && pxArea < CACHE_AREA_MAX)) return false;

    return true;
  }, [assetsReady, allowCacheAtThisZoom, selected, hovered, panMode, editMode, item.w, item.h, stageScale]);

  useEffect(() => {
    const g = groupRef.current;
    if (!g) return;

    const keyChanged = lastKeyRef.current !== cacheKey;
    lastKeyRef.current = cacheKey;

    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;

      try {
        // If we can’t cache, ensure live render (crisp)
        if (!shouldCache) {
          if (g.isCached()) g.clearCache();
          g.getLayer()?.batchDraw();
          return;
        }

        // Cache path
        if (keyChanged && g.isCached()) g.clearCache();

        if (!g.isCached()) {
          // ✅ Use DPR for cache bitmap so it’s not blurry on normal zoom.
          // We still avoid caching on high zoom.
          const dpr = typeof window !== "undefined" ? Math.min(2, window.devicePixelRatio || 1) : 1;
          g.cache({ pixelRatio: dpr });
          g.getLayer()?.batchDraw();
        }
      } catch {
        // ignore
      }
    });

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [groupRef, shouldCache, cacheKey]);
}
