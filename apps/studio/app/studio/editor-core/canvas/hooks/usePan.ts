// apps/studio/app/studio/editor-core/canvas/hooks/usePan.ts
"use client";

import { useCallback, useRef } from "react";
import type Konva from "konva";
import { useRafThrottled } from "./useRafThrottled";

export function usePan(args: {
  stageRef: React.RefObject<Konva.Stage | null>;
  panMode: boolean;
  stagePos: { x: number; y: number };
  setStagePos: (p: { x: number; y: number }) => void;

  stageScale: number;

  setSelectedIds: (ids: string[]) => void;
  setToolbarBox: (b: any) => void;

  setWrapCursor: (cursor: string) => void;
  cursorRef: React.MutableRefObject<string>;

  setCursorWorld: (pos: { x: number; y: number } | null) => void;

  updateSelectionUIRaf: () => void;

  worldFromScreen: (p: { x: number; y: number }) => { x: number; y: number };
  onAddItemAtWorld: (args: { type: any; x: number; y: number }) => void;
  tool: any;
}) {
  const panningRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    startPosX: 0,
    startPosY: 0,
  });

  const emptyDownRef = useRef<{ x: number; y: number } | null>(null);
  const didPanRef = useRef(false);

  const isEmptyHit = useCallback((e: any) => {
    const stage = args.stageRef.current;
    if (!stage) return false;
    return e.target === stage;
  }, [args.stageRef]);

  const startPan = useCallback(
    (pointer: { x: number; y: number }) => {
      panningRef.current = {
        active: true,
        startX: pointer.x,
        startY: pointer.y,
        startPosX: args.stagePos.x,
        startPosY: args.stagePos.y,
      };
      args.setWrapCursor("grabbing");
    },
    [args.stagePos.x, args.stagePos.y, args.setWrapCursor]
  );

  const setCursorWorldRaf = useRafThrottled(args.setCursorWorld);

  const onStagePointerDown = useCallback(
    (e: any) => {
      const stage = args.stageRef.current;
      if (!stage) return;

      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      if (args.panMode || isEmptyHit(e)) {
        emptyDownRef.current = { x: pointer.x, y: pointer.y };
        didPanRef.current = false;
        startPan(pointer);
      }
    },
    [args.panMode, isEmptyHit, startPan]
  );

  const onStagePointerMove = useCallback(() => {
    const stage = args.stageRef.current;
    if (!stage) return;

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    setCursorWorldRaf(args.worldFromScreen(pointer));

    if (!panningRef.current.active) return;

    const dx = pointer.x - panningRef.current.startX;
    const dy = pointer.y - panningRef.current.startY;

    if (!didPanRef.current) {
      const d = Math.hypot(dx, dy);
      if (d > 3) didPanRef.current = true;
    }

    args.setStagePos({
      x: panningRef.current.startPosX + dx,
      y: panningRef.current.startPosY + dy,
    });

    args.updateSelectionUIRaf();
  }, [args, setCursorWorldRaf]);

  const endPan = useCallback(() => {
    panningRef.current.active = false;
    args.setWrapCursor(args.cursorRef.current || "default");
  }, [args]);

  const onStagePointerUp = useCallback(() => {
    if (emptyDownRef.current && !didPanRef.current && !args.panMode) {
      args.setSelectedIds([]);
      args.setToolbarBox(null);
    }
    emptyDownRef.current = null;
    didPanRef.current = false;
    endPan();
  }, [args.panMode, args.setSelectedIds, args.setToolbarBox, endPan]);

  const onDblClick = useCallback(
    (e: any) => {
      const stage = args.stageRef.current;
      if (!stage) return;

      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      if (!isEmptyHit(e)) return;

      const world = args.worldFromScreen(pointer);
      args.onAddItemAtWorld({ type: args.tool, x: world.x - 90, y: world.y - 60 });
    },
    [args, isEmptyHit]
  );

  return { onStagePointerDown, onStagePointerMove, onStagePointerUp, onDblClick, panningRef };
}
