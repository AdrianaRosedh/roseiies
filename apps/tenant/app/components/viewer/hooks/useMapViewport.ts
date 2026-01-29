"use client";

import { useCallback, useMemo, useState } from "react";

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

export function useMapViewport(args: {
  viewportWidth: number;
  viewportHeight: number;
  contentWidth: number;
  contentHeight: number;
  padding: number;
}) {
  const { viewportWidth, viewportHeight, contentWidth, contentHeight, padding } = args;

  const [vp, setVp] = useState({ x: 0, y: 0, scale: 1 });

  const fitToContent = useCallback(() => {
    if (viewportWidth <= 0 || viewportHeight <= 0) return;

    const w = Math.max(1, contentWidth);
    const h = Math.max(1, contentHeight);

    const sx = (viewportWidth - padding * 2) / w;
    const sy = (viewportHeight - padding * 2) / h;
    const scale = clamp(Math.min(sx, sy), 0.05, 4);

    const x = (viewportWidth - w * scale) / 2;
    const y = (viewportHeight - h * scale) / 2;

    setVp({ x, y, scale });
  }, [viewportWidth, viewportHeight, contentWidth, contentHeight, padding]);

  const onWheel = useCallback(
    (e: any) => {
      e.evt?.preventDefault?.();

      const stage = e.target?.getStage?.();
      if (!stage) return;

      const oldScale = vp.scale;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const wheelDelta = e.evt.deltaY;
      const dir = wheelDelta > 0 ? -1 : 1;
      const factor = 1.06;
      const newScale = clamp(dir > 0 ? oldScale * factor : oldScale / factor, 0.05, 6);

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
    [vp]
  );

  return useMemo(
    () => ({
      vp,
      setVp,
      fitToContent,
      onWheel,
      isPinching: false,
      setStageRef: (_s: any) => {},
    }),
    [vp, setVp, fitToContent, onWheel]
  );
}
