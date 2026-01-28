// apps/tenant/app/components/garden/viewer/hooks/useMapViewport.ts
"use client";

import { useCallback, useRef, useState } from "react";
import type Konva from "konva";
import type { Item } from "../types";

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function center(a: { x: number; y: number }, b: { x: number; y: number }) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function useMapViewport(args: {
  viewportWidth: number;
  viewportHeight: number;
  contentWidth: number;
  contentHeight: number;
  padding?: number;
}) {
  const { viewportWidth, viewportHeight, contentWidth, contentHeight } = args;
  const padding = args.padding ?? 120;

  const stageRef = useRef<Konva.Stage | null>(null);

  const minScale = 0.4;
  const maxScale = 1.8;

  const [vp, setVp] = useState(() => {
    const vw = Math.max(1, viewportWidth);
    const vh = Math.max(1, viewportHeight);

    const sx = (vw - padding * 2) / Math.max(1, contentWidth);
    const sy = (vh - padding * 2) / Math.max(1, contentHeight);
    const scale = clamp(Math.min(sx, sy), minScale, maxScale);

    const x = (vw - contentWidth * scale) / 2;
    const y = (vh - contentHeight * scale) / 2;

    return { x, y, scale };
  });

  const [isPinching, setIsPinching] = useState(false);
  const hasInteractedRef = useRef(false);

  const setStageRef = useCallback((s: Konva.Stage | null) => {
    stageRef.current = s;
  }, []);

  // ✅ use stage-local coords (fixes “fly away” / offset pinch)
  const clientToStagePoint = useCallback((clientX: number, clientY: number) => {
    const stage = stageRef.current;
    if (!stage) return { x: clientX, y: clientY };
    const rect = stage.container().getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }, []);

  const zoomAtPoint = useCallback(
    (point: { x: number; y: number }, nextScale: number) => {
      hasInteractedRef.current = true;

      const scale = clamp(nextScale, minScale, maxScale);

      setVp((prev) => {
        const old = prev.scale;
        const wx = (point.x - prev.x) / old;
        const wy = (point.y - prev.y) / old;

        const x = point.x - wx * scale;
        const y = point.y - wy * scale;

        return { x, y, scale };
      });
    },
    []
  );

  const onWheel = useCallback(
    (e: any) => {
      e.evt.preventDefault();
      hasInteractedRef.current = true;

      const stage = stageRef.current;
      if (!stage) return;

      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const deltaY = e.evt.deltaY ?? 0;
      const direction = deltaY > 0 ? -1 : 1;

      const factor = 1.08;
      const next = direction > 0 ? vp.scale * factor : vp.scale / factor;

      zoomAtPoint(pointer, next);
    },
    [vp.scale, zoomAtPoint]
  );

  const pinchRef = useRef<{
    lastDist: number | null;
    lastCenter: { x: number; y: number } | null;
  }>({ lastDist: null, lastCenter: null });

  const onTouchStart = useCallback(
    (e: any) => {
      const touches = e.evt.touches;
      if (!touches || touches.length < 2) return;

      e.evt.preventDefault();
      setIsPinching(true);

      const p1 = clientToStagePoint(touches[0].clientX, touches[0].clientY);
      const p2 = clientToStagePoint(touches[1].clientX, touches[1].clientY);

      pinchRef.current.lastCenter = center(p1, p2);
      pinchRef.current.lastDist = dist(p1, p2);
    },
    [clientToStagePoint]
  );

  const onTouchMove = useCallback(
    (e: any) => {
      const t1 = e.evt.touches?.[0];
      const t2 = e.evt.touches?.[1];
      if (!t1 || !t2) return;

      e.evt.preventDefault();
      hasInteractedRef.current = true;

      const p1 = clientToStagePoint(t1.clientX, t1.clientY);
      const p2 = clientToStagePoint(t2.clientX, t2.clientY);

      const c = center(p1, p2);
      const d = dist(p1, p2);

      const prevDist = pinchRef.current.lastDist;
      const prevCenter = pinchRef.current.lastCenter;

      pinchRef.current.lastDist = d;
      pinchRef.current.lastCenter = c;

      if (!prevDist || !prevCenter) return;

      const ratio = d / prevDist;
      zoomAtPoint(c, vp.scale * ratio);
    },
    [vp.scale, zoomAtPoint, clientToStagePoint]
  );

  const onTouchEnd = useCallback(() => {
    pinchRef.current.lastDist = null;
    pinchRef.current.lastCenter = null;
    setIsPinching(false);
  }, []);

  const fitToRect = useCallback(
    (rect: { x: number; y: number; w: number; h: number }, pad = padding) => {
      const vw = Math.max(1, viewportWidth);
      const vh = Math.max(1, viewportHeight);

      const sx = (vw - pad * 2) / Math.max(1, rect.w);
      const sy = (vh - pad * 2) / Math.max(1, rect.h);
      const scale = clamp(Math.min(sx, sy), minScale, maxScale);

      const cx = rect.x + rect.w / 2;
      const cy = rect.y + rect.h / 2;

      const x = vw / 2 - cx * scale;
      const y = vh / 2 - cy * scale;

      setVp({ x, y, scale });
    },
    [viewportWidth, viewportHeight, padding]
  );

  // ✅ use passed padding (no hardcoded 200)
  const fitToContent = useCallback(() => {
    fitToRect({ x: 0, y: 0, w: contentWidth, h: contentHeight }, padding);
  }, [fitToRect, contentWidth, contentHeight, padding]);

  // Keep for explicit “zoom to bed” actions if you want later
  const focusBed = useCallback(
    (bed: Item) => {
      fitToRect({ x: bed.x, y: bed.y, w: bed.w, h: bed.h }, Math.max(140, padding));
    },
    [fitToRect, padding]
  );

  // ✅ Normal tap behavior: PAN only (no zoom jump)
  const panToBed = useCallback(
    (bed: Item) => {
      hasInteractedRef.current = true;

      setVp((prev) => {
        const vw = Math.max(1, viewportWidth);
        const vh = Math.max(1, viewportHeight);

        const cx = bed.x + bed.w / 2;
        const cy = bed.y + bed.h / 2;

        const x = vw / 2 - cx * prev.scale;
        const y = vh / 2 - cy * prev.scale;

        return { x, y, scale: prev.scale };
      });
    },
    [viewportWidth, viewportHeight]
  );

  return {
    vp,
    setVp,
    isPinching,
    setStageRef,
    onWheel,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    zoomAtPoint,
    fitToContent,
    focusBed,
    panToBed,
    hasInteractedRef,
  };
}
