"use client";

import { useCallback, useEffect, useRef } from "react";
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

  hasSelection?: boolean;

  placeMode?: { tool: any; keepOpen?: boolean } | null;
  onExitPlaceMode?: () => void;
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

  const livePosRef = useRef<{ x: number; y: number }>(args.stagePos);

  useEffect(() => {
    if (panningRef.current.active) return;
    livePosRef.current = args.stagePos;

    const stage = args.stageRef.current;
    if (!stage) return;

    stage.position(args.stagePos);
    stage.batchDraw();
  }, [args.stagePos.x, args.stagePos.y, args.stageRef]);

  const setCursorWorldRaf = useRafThrottled(args.setCursorWorld);

  const isEmptyHit = useCallback(
    (e: any) => {
      const stage = args.stageRef.current;
      if (!stage) return false;
      return e.target === stage;
    },
    [args.stageRef]
  );

  const startPan = useCallback(
    (pointer: { x: number; y: number }) => {
      const stage = args.stageRef.current;
      if (!stage) return;

      const pos = stage.position();

      panningRef.current = {
        active: true,
        startX: pointer.x,
        startY: pointer.y,
        startPosX: pos.x,
        startPosY: pos.y,
      };

      livePosRef.current = { x: pos.x, y: pos.y };
      args.setWrapCursor("grabbing");
    },
    [args.stageRef, args.setWrapCursor]
  );

  const onStagePointerDown = useCallback(
    (e: any) => {
      const stage = args.stageRef.current;
      if (!stage) return;

      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const empty = isEmptyHit(e);

      // place mode only on empty (and not while panning)
      if (args.placeMode && empty && !args.panMode) {
        e.cancelBubble = true;

        const world = args.worldFromScreen(pointer);
        args.onAddItemAtWorld({
          type: args.placeMode.tool,
          x: world.x - 90,
          y: world.y - 60,
        });

        if (!args.placeMode.keepOpen) args.onExitPlaceMode?.();
        return;
      }

      // ✅ CRITICAL FIX:
      // If panMode is ON and user clicked an ITEM, do NOT start panning.
      // Let the item receive click/selection/transform normally.
      if (args.panMode && !empty) return;

      // Pan on empty canvas (always allowed)
      if (empty || args.panMode) {
        emptyDownRef.current = { x: pointer.x, y: pointer.y };
        didPanRef.current = false;
        startPan(pointer);
      }
    },
    [args, isEmptyHit, startPan]
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
      if (d > 2) didPanRef.current = true;
    }

    const next = {
      x: panningRef.current.startPosX + dx,
      y: panningRef.current.startPosY + dy,
    };

    livePosRef.current = next;

    stage.position(next);
    stage.batchDraw();

    if (args.hasSelection) args.updateSelectionUIRaf();
  }, [args, setCursorWorldRaf]);

  const endPan = useCallback(() => {
    panningRef.current.active = false;
    args.setWrapCursor(args.cursorRef.current || "default");
    args.setStagePos(livePosRef.current);
  }, [args]);

  const onStagePointerUp = useCallback(() => {
    // Only clear selection on an empty click when NOT in panMode
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