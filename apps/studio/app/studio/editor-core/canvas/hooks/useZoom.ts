// apps/studio/app/studio/editor-core/canvas/hooks/useZoom.ts
"use client";

import { useCallback, useEffect, useRef } from "react";
import type Konva from "konva";
import { clamp } from "../utils/math";

export function useZoom(args: {
  stageRef: React.RefObject<Konva.Stage | null>;

  // React-state camera (commit only)
  stageScale: number;
  setStageScale: (s: number) => void;
  stagePos: { x: number; y: number };
  setStagePos: (p: { x: number; y: number }) => void;

  updateSelectionUIRaf: () => void;
}) {
  const liveScaleRef = useRef(args.stageScale);
  const livePosRef = useRef(args.stagePos);

  // keep stage in sync when NOT zooming (external state changes)
  const zoomingRef = useRef(false);
  useEffect(() => {
    if (zoomingRef.current) return;

    liveScaleRef.current = args.stageScale;
    livePosRef.current = args.stagePos;

    const stage = args.stageRef.current;
    if (!stage) return;

    stage.scale({ x: args.stageScale, y: args.stageScale });
    stage.position(args.stagePos);
    stage.batchDraw();
  }, [args.stageScale, args.stagePos.x, args.stagePos.y, args.stageRef]);

  // commit after wheel settles
  const wheelCommitTimer = useRef<number | null>(null);
  function scheduleCommit() {
    if (wheelCommitTimer.current) window.clearTimeout(wheelCommitTimer.current);
    wheelCommitTimer.current = window.setTimeout(() => {
      wheelCommitTimer.current = null;
      zoomingRef.current = false;

      args.setStageScale(liveScaleRef.current);
      args.setStagePos(livePosRef.current);
    }, 90);
  }

  const onWheel = useCallback(
    (e: any) => {
      e.evt.preventDefault();
      const stage = args.stageRef.current;
      if (!stage) return;

      zoomingRef.current = true;

      const oldScale = stage.scaleX(); // use stage as source of truth during interaction
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const scaleBy = 1.04;
      const direction = e.evt.deltaY > 0 ? -1 : 1;

      let newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;
      newScale = clamp(newScale, 0.35, 2.6);

      const pos = stage.position();

      // keep pointer fixed in world space
      const mousePointTo = {
        x: (pointer.x - pos.x) / oldScale,
        y: (pointer.y - pos.y) / oldScale,
      };

      const nextPos = {
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
      };

      // ✅ imperative update
      stage.scale({ x: newScale, y: newScale });
      stage.position(nextPos);
      stage.batchDraw();

      liveScaleRef.current = newScale;
      livePosRef.current = nextPos;

      args.updateSelectionUIRaf();
      scheduleCommit();
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
      zoomingRef.current = true;

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

      const oldScale = stage.scaleX();
      const scaleBy = d / pr.lastDist;
      const newScale = clamp(oldScale * scaleBy, 0.35, 2.6);

      const pos = stage.position();
      const pointTo = {
        x: (c.x - pos.x) / oldScale,
        y: (c.y - pos.y) / oldScale,
      };

      const nextPos = {
        x: c.x - pointTo.x * newScale,
        y: c.y - pointTo.y * newScale,
      };

      stage.scale({ x: newScale, y: newScale });
      stage.position(nextPos);
      stage.batchDraw();

      liveScaleRef.current = newScale;
      livePosRef.current = nextPos;

      pr.lastCenter = c;
      pr.lastDist = d;

      args.updateSelectionUIRaf();
    },
    [args]
  );

  const onTouchEnd = useCallback(() => {
    pinchRef.current.lastCenter = null;
    pinchRef.current.lastDist = 0;

    zoomingRef.current = false;

    // ✅ commit once at end
    args.setStageScale(liveScaleRef.current);
    args.setStagePos(livePosRef.current);
  }, [args]);

  return { onWheel, onTouchMove, onTouchEnd };
}