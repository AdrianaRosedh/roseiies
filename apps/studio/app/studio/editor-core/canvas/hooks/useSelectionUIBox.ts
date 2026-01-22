// apps/studio/app/studio/editor-core/canvas/hooks/useSelectionUIBox.ts
"use client";

import { useCallback, useEffect, useState } from "react";
import type Konva from "konva";
import type { ScreenBox } from "../types";
import { useRafThrottled } from "./useRafThrottled";

export function useSelectionUIBox(args: {
  wrapRef: React.RefObject<HTMLDivElement | null>;
  stageRef: React.RefObject<Konva.Stage | null>;
  trRef: React.RefObject<Konva.Transformer | null>;
  nodeMapRef: React.MutableRefObject<Map<string, Konva.Node>>;
  selectedIds: string[];
  items: any[]; // doc.items (used to trigger effects)
  stagePos: { x: number; y: number };
  stageScale: number;
}) {
  const [toolbarBox, setToolbarBox] = useState<ScreenBox>(null);

  const updateSelectionUI = useCallback(() => {
    const stage = args.stageRef.current;
    const wrap = args.wrapRef.current;
    if (!stage || !wrap) return setToolbarBox(null);
    if (args.selectedIds.length === 0) return setToolbarBox(null);

    const tr = args.trRef.current;
    const firstNode = args.nodeMapRef.current.get(args.selectedIds[0]);
    const nodeForRect = tr && tr.nodes().length ? tr : firstNode;
    if (!nodeForRect) return setToolbarBox(null);

    const rect = (nodeForRect as any).getClientRect?.({ skipTransform: false }) as
      | { x: number; y: number; width: number; height: number }
      | undefined;

    if (!rect) return setToolbarBox(null);

    setToolbarBox({
      left: args.stagePos.x + rect.x * args.stageScale,
      top: args.stagePos.y + rect.y * args.stageScale,
      width: rect.width * args.stageScale,
      height: rect.height * args.stageScale,
    });
  }, [args.selectedIds, args.stagePos.x, args.stagePos.y, args.stageScale]);

  const updateSelectionUIRaf = useRafThrottled(updateSelectionUI);

  // Transformer nodes sync
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

  // keep updated when viewport moves/scales
  useEffect(() => {
    updateSelectionUIRaf();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [args.stagePos.x, args.stagePos.y, args.stageScale]);

  return { toolbarBox, setToolbarBox, updateSelectionUIRaf };
}
