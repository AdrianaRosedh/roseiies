// apps/studio/app/studio/editor-core/canvas/hooks/useZoom.ts
"use client";

import { useCallback, useRef } from "react";
import type Konva from "konva";
import { clamp } from "../utils/math";

export function useZoom(args: {
  stageRef: React.RefObject<Konva.Stage | null>;
  stageScale: number;
  setStageScale: (s: number) => void;
  stagePos: { x: number; y: number };
  setStagePos: (p: { x: number; y: number }) => void;
  updateSelectionUIRaf: () => void;
}) {
  const onWheel = useCallback(
    (e: any) => {
      e.evt.preventDefault();
      const stage = args.stageRef.current;
      if (!stage) return;

      const oldScale = args.stageScale;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const scaleBy = 1.04;
      const direction = e.evt.deltaY > 0 ? -1 : 1;

      let newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;
      newScale = clamp(newScale, 0.35, 2.6);

      const mousePointTo = {
        x: (pointer.x - args.stagePos.x) / oldScale,
        y: (pointer.y - args.stagePos.y) / oldScale,
      };

      args.setStageScale(newScale);
      args.setStagePos({
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
      });

      args.updateSelectionUIRaf();
    },
    [args]
  );

  const pinchRef = useRef<{ lastDist: number; lastCenter: { x: number; y: number } | null }>({
    lastDist: 0,
    lastCenter: null,
  });

  function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }
  function center(a: { x: number; y: number }, b: { x: number; y: number }) {
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }

  const onTouchMove = useCallback(
    (e: any) => {
      const stage = args.stageRef.current;
      if (!stage) return;

      const pts = stage.getPointersPositions();
      if (!pts || pts.length !== 2) return;

      e.evt.preventDefault();

      const p1 = pts[0];
      const p2 = pts[1];

      const c = center(p1, p2);
      const d = dist(p1, p2);

      const pr = pinchRef.current;
      if (!pr.lastCenter) {
        pr.lastCenter = c;
        pr.lastDist = d;
        return;
      }

      const oldScale = args.stageScale;
      const scaleBy = d / pr.lastDist;
      const newScale = clamp(oldScale * scaleBy, 0.35, 2.6);

      const pointTo = {
        x: (c.x - args.stagePos.x) / oldScale,
        y: (c.y - args.stagePos.y) / oldScale,
      };

      args.setStageScale(newScale);
      args.setStagePos({
        x: c.x - pointTo.x * newScale,
        y: c.y - pointTo.y * newScale,
      });

      pr.lastCenter = c;
      pr.lastDist = d;

      args.updateSelectionUIRaf();
    },
    [args]
  );

  const onTouchEnd = useCallback(() => {
    pinchRef.current.lastCenter = null;
    pinchRef.current.lastDist = 0;
  }, []);

  return { onWheel, onTouchMove, onTouchEnd };
}
