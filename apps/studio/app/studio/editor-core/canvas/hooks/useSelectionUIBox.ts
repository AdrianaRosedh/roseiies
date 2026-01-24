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
  nodeMapRef: React.MutableRefObject<Map<string, Konva.Node>>; // kept for compatibility
  selectedIds: string[];
  items: any[];
  stagePos: { x: number; y: number };
  stageScale: number;
  selectionVersion?: number;
}) {
  const [toolbarBox, setToolbarBox] = useState<ScreenBox>(null);
  const lastBoxRef = useRef<ScreenBox>(null);

  const getSelectedNodes = useCallback(() => {
    const stage = args.stageRef.current;
    if (!stage) return [] as Konva.Node[];

    const out: Konva.Node[] = [];
    for (const id of args.selectedIds) {
      // ✅ deterministic: ItemNode Group has id={item.id}
      const node = stage.findOne(`#${id}`) as Konva.Node | null;
      if (node) out.push(node);
    }
    return out;
  }, [args.stageRef, args.selectedIds]);

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
    const hasTrNodes = Boolean(tr && tr.nodes().length > 0);

    const nodeForRect = hasTrNodes ? tr : getSelectedNodes()[0];
    if (!nodeForRect) return;

    const rect = (nodeForRect as any).getClientRect?.({ skipTransform: false }) as
      | { x: number; y: number; width: number; height: number }
      | undefined;

    if (!rect) return;

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
  }, [args.stageRef, args.wrapRef, args.trRef, args.selectedIds, getSelectedNodes]);

  const updateSelectionUIRaf = useRafThrottled(updateSelectionUI);

  const attachAttemptRef = useRef(0);
  const attachRafRef = useRef<number | null>(null);

  const attachTransformerNodes = useCallback(() => {
    const tr = args.trRef.current;
    const stage = args.stageRef.current;
    if (!tr || !stage) return 0;

    const nodes = getSelectedNodes();
    tr.nodes(nodes);
    tr.getLayer()?.batchDraw();
    updateSelectionUIRaf();
    return nodes.length;
  }, [args.trRef, args.stageRef, getSelectedNodes, updateSelectionUIRaf]);

  useEffect(() => {
    if (attachRafRef.current != null) {
      cancelAnimationFrame(attachRafRef.current);
      attachRafRef.current = null;
    }

    if (args.selectedIds.length === 0) {
      const tr = args.trRef.current;
      if (tr) {
        tr.nodes([]);
        tr.getLayer()?.batchDraw();
      }
      updateSelectionUIRaf();
      return;
    }

    attachAttemptRef.current = 0;

    const tryAttach = () => {
      attachAttemptRef.current += 1;
      const count = attachTransformerNodes();

      // retry while nodes mount
      if (count === 0 && attachAttemptRef.current < 12) {
        attachRafRef.current = requestAnimationFrame(tryAttach);
        return;
      }

      attachRafRef.current = null;
    };

    tryAttach();

    return () => {
      if (attachRafRef.current != null) cancelAnimationFrame(attachRafRef.current);
      attachRafRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [args.selectedIds.join("|"), args.items, args.selectionVersion]);

  useEffect(() => {
    updateSelectionUIRaf();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [args.stagePos.x, args.stagePos.y, args.stageScale]);

  return { toolbarBox, setToolbarBox, updateSelectionUIRaf };
}