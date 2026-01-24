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

  assetsReady?: boolean;
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

  // cache only when zoomed OUT (perf mode). zoomed IN should be crisp.
  const allowCacheAtZoom = stageScale <= 1.15;

  const shouldCache = useMemo(() => {
    if (!assetsReady) return false;
    if (!allowCacheAtZoom) return false;

    if (selected) return false;
    if (hovered) return false;
    if (panMode) return false;
    if (editMode !== "none") return false;

    const pxW = item.w * stageScale;
    const pxH = item.h * stageScale;
    const pxArea = pxW * pxH;
    const CACHE_AREA_MAX = 1.2e6;
    if (!(pxArea > 0 && pxArea < CACHE_AREA_MAX)) return false;

    return true;
  }, [assetsReady, allowCacheAtZoom, selected, hovered, panMode, editMode, item.w, item.h, stageScale]);

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
        if (!assetsReady || !shouldCache) {
          if (g.isCached()) g.clearCache();
          g.getLayer()?.batchDraw();
          return;
        }

        if (keyChanged && g.isCached()) g.clearCache();

        if (!g.isCached()) {
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
  }, [groupRef, shouldCache, assetsReady, cacheKey]);
}
