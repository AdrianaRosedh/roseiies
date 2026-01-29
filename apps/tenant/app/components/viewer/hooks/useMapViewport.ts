"use client";

import { useCallback, useMemo, useState } from "react";

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function computeFitScale(args: {
  viewportWidth: number;
  viewportHeight: number;
  contentWidth: number;
  contentHeight: number;
  padding: number;
}) {
  const vw = Math.max(1, args.viewportWidth);
  const vh = Math.max(1, args.viewportHeight);
  const cw = Math.max(1, args.contentWidth);
  const ch = Math.max(1, args.contentHeight);

  const sx = (vw - args.padding * 2) / cw;
  const sy = (vh - args.padding * 2) / ch;

  // Fit scale, but keep it sane
  return clamp(Math.min(sx, sy), 0.08, 6);
}

export function useMapViewport(args: {
  viewportWidth: number;
  viewportHeight: number;
  contentWidth: number;
  contentHeight: number;
  padding: number;
}) {
  const { viewportWidth, viewportHeight, contentWidth, contentHeight, padding } =
    args;

  // ✅ dynamic min scale = fit-to-content scale
  const minScale = useMemo(
    () =>
      computeFitScale({
        viewportWidth,
        viewportHeight,
        contentWidth,
        contentHeight,
        padding,
      }),
    [viewportWidth, viewportHeight, contentWidth, contentHeight, padding]
  );

  const maxScale = 6;

  const [vp, setVp] = useState({ x: 0, y: 0, scale: 1 });

  const fitToContent = useCallback(() => {
    if (viewportWidth <= 0 || viewportHeight <= 0) return;

    const scale = minScale;

    const w = Math.max(1, contentWidth);
    const h = Math.max(1, contentHeight);

    const x = (viewportWidth - w * scale) / 2;
    const y = (viewportHeight - h * scale) / 2;

    setVp({ x, y, scale });
  }, [viewportWidth, viewportHeight, contentWidth, contentHeight, minScale]);

  const onWheel = useCallback(
    (e: any) => {
      e.evt?.preventDefault?.();

      const stage = e.target?.getStage?.();
      if (!stage) return;

      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const oldScale = vp.scale;

      const wheelDelta = e.evt.deltaY ?? 0;
      const dir = wheelDelta > 0 ? -1 : 1;
      const factor = 1.06;

      const rawNext = dir > 0 ? oldScale * factor : oldScale / factor;
      const newScale = clamp(rawNext, minScale, maxScale); // ✅ clamp!

      // keep zoom centered around pointer
      const mousePointTo = {
        x: (pointer.x - vp.x) / oldScale,
        y: (pointer.y - vp.y) / oldScale,
      };

      const newPos = {
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
      };

      setVp({ x: newPos.x, y: newPos.y, scale: newScale });
    },
    [vp, minScale]
  );

  return useMemo(
    () => ({
      vp,
      setVp,
      fitToContent,
      onWheel,
      isPinching: false,
      setStageRef: (_s: any) => {},
      minScale,
      maxScale,
    }),
    [vp, setVp, fitToContent, onWheel, minScale]
  );
}
