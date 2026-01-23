"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type Konva from "konva";
import type { ScreenBox } from "../types";
import { useRafThrottled } from "./useRafThrottled";

function nearlyEqual(a: number, b: number, eps = 0.5) {
  return Math.abs(a - b) <= eps;
}

function sameBox(a: ScreenBox, b: ScreenBox) {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    nearlyEqual(a.left, b.left) &&
    nearlyEqual(a.top, b.top) &&
    nearlyEqual(a.width, b.width) &&
    nearlyEqual(a.height, b.height)
  );
}

export function useSelectionUIBox(args: {
  wrapRef: React.RefObject<HTMLDivElement | null>;
  stageRef: React.RefObject<Konva.Stage | null>;
  trRef: React.RefObject<Konva.Transformer | null>;
  nodeMapRef: React.MutableRefObject<Map<string, Konva.Node>>;
  selectedIds: string[];
  items: any[];
  stagePos: { x: number; y: number };
  stageScale: number;
}) {
  const [toolbarBox, setToolbarBox] = useState<ScreenBox>(null);
  const lastBoxRef = useRef<ScreenBox>(null);

  const updateSelectionUI = useCallback(() => {
    const stage = args.stageRef.current;
    const wrap = args.wrapRef.current;

    if (!stage || !wrap || args.selectedIds.length === 0) {
      if (lastBoxRef.current !== null) {
        lastBoxRef.current = null;
        setToolbarBox(null);
      }
      return;
    }

    const tr = args.trRef.current;
    const firstNode = args.nodeMapRef.current.get(args.selectedIds[0]);
    const nodeForRect = tr && tr.nodes().length ? tr : firstNode;
    if (!nodeForRect) return;

    const rect = (nodeForRect as any).getClientRect?.({ skipTransform: false }) as
      | { x: number; y: number; width: number; height: number }
      | undefined;

    if (!rect) return;

    // ✅ live stage is source-of-truth during pan/zoom
    const pos = stage.position();
    const scale = stage.scaleX();

    const next: ScreenBox = {
      left: pos.x + rect.x * scale,
      top: pos.y + rect.y * scale,
      width: rect.width * scale,
      height: rect.height * scale,
    };

    if (!sameBox(lastBoxRef.current, next)) {
      lastBoxRef.current = next;
      setToolbarBox(next);
    }
  }, [args.selectedIds, args.stageRef, args.wrapRef, args.trRef, args.nodeMapRef]);

  const updateSelectionUIRaf = useRafThrottled(updateSelectionUI);

  useEffect(() => {
    const tr = args.trRef.current;
    if (!tr) return;

    const nodes: Konva.Node[] = [];
    for (const id of args.selectedIds) {
      const n = args.nodeMapRef.current.get(id);
      if (n) nodes.push(n);
    }
    tr.nodes(nodes);
    tr.getLayer()?.batchDraw();

    updateSelectionUIRaf();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [args.selectedIds, args.items]);

  useEffect(() => {
    updateSelectionUIRaf();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [args.stagePos.x, args.stagePos.y, args.stageScale]);

  return { toolbarBox, setToolbarBox, updateSelectionUIRaf };
}