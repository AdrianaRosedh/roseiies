"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import type Konva from "konva";
import type React from "react";

type Vec2 = { x: number; y: number };
type Size2 = { w: number; h: number };

function samePos(a: Vec2, b: Vec2) {
  return a.x === b.x && a.y === b.y;
}

function degToRad(d: number) {
  return (d * Math.PI) / 180;
}

function boundsOfRotatedRect(it: { x: number; y: number; w: number; h: number; r?: number }) {
  const r = it.r ?? 0;
  const cx = it.x + it.w / 2;
  const cy = it.y + it.h / 2;

  const a = degToRad(r);
  const cos = Math.cos(a);
  const sin = Math.sin(a);

  const pts = [
    { x: it.x, y: it.y },
    { x: it.x + it.w, y: it.y },
    { x: it.x + it.w, y: it.y + it.h },
    { x: it.x, y: it.y + it.h },
  ].map((p) => {
    const dx = p.x - cx;
    const dy = p.y - cy;
    return {
      x: cx + dx * cos - dy * sin,
      y: cy + dx * sin + dy * cos,
    };
  });

  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }

  return { minX, minY, maxX, maxY };
}

export function useCanvasCamera(args: {
  stageRef: React.RefObject<Konva.Stage | null>;

  stageSize: Size2;
  stagePos: Vec2;
  setStagePos: (p: Vec2) => void;

  stageScale: number;
  setStageScale: (s: number) => void;

  plotW: number;
  plotH: number;

  constrainView: boolean;

  clampPadPx?: number;
  clampScaleRange?: { min: number; max: number };
}) {
  const clampPadPx = args.clampPadPx ?? 90;
  const clampScaleRange = args.clampScaleRange ?? { min: 0.05, max: 8 };

  // ✅ live scale while wheel/pinch is happening (prevents snap/jump)
  const getLiveScale = useCallback(() => {
    const s = args.stageRef.current?.scaleX?.();
    return typeof s === "number" && isFinite(s) ? s : args.stageScale;
  }, [args.stageRef, args.stageScale]);

  const clampStagePosToPlot = useCallback(
    (pos: Vec2) => {
      const pad = clampPadPx;

      const liveScale = getLiveScale();
      const scaledW = args.plotW * liveScale;
      const scaledH = args.plotH * liveScale;

      const centerX = (args.stageSize.w - scaledW) / 2;
      const centerY = (args.stageSize.h - scaledH) / 2;

      let minX: number, maxX: number;
      if (scaledW + pad * 2 <= args.stageSize.w) {
        minX = maxX = centerX;
      } else {
        minX = args.stageSize.w - scaledW - pad;
        maxX = pad;
      }

      let minY: number, maxY: number;
      if (scaledH + pad * 2 <= args.stageSize.h) {
        minY = maxY = centerY;
      } else {
        minY = args.stageSize.h - scaledH - pad;
        maxY = pad;
      }

      const clamped = {
        x: Math.max(minX, Math.min(maxX, pos.x)),
        y: Math.max(minY, Math.min(maxY, pos.y)),
      };

      // tiny epsilon avoids micro jitter at bounds
      const EPS = 0.15;
      return {
        x: Math.abs(clamped.x - pos.x) < EPS ? pos.x : clamped.x,
        y: Math.abs(clamped.y - pos.y) < EPS ? pos.y : clamped.y,
      };
    },
    [args.plotW, args.plotH, args.stageSize.w, args.stageSize.h, clampPadPx, getLiveScale]
  );

  const setStagePosSmart = useCallback(
    (p: Vec2) => {
      const next = args.constrainView ? clampStagePosToPlot(p) : p;
      if (!samePos(next, args.stagePos)) args.setStagePos(next);
    },
    [args.constrainView, clampStagePosToPlot, args.setStagePos, args.stagePos]
  );

  // clamp once when turning constrainView ON
  const prevConstrainRef = useRef(args.constrainView);
  useEffect(() => {
    const prev = prevConstrainRef.current;
    prevConstrainRef.current = args.constrainView;

    if (!prev && args.constrainView) {
      const next = clampStagePosToPlot(args.stagePos);
      if (!samePos(next, args.stagePos)) args.setStagePos(next);
    }
  }, [args.constrainView, clampStagePosToPlot, args.setStagePos, args.stagePos]);

  const worldFromScreen = useCallback(
    (p: Vec2) => {
      const s = getLiveScale();
      return {
        x: (p.x - args.stagePos.x) / s,
        y: (p.y - args.stagePos.y) / s,
      };
    },
    [args.stagePos.x, args.stagePos.y, getLiveScale]
  );

  const screenFromWorld = useCallback(
    (p: Vec2) => {
      const s = getLiveScale();
      return {
        x: args.stagePos.x + p.x * s,
        y: args.stagePos.y + p.y * s,
      };
    },
    [args.stagePos.x, args.stagePos.y, getLiveScale]
  );

  const setCameraToWorldRect = useCallback(
    (opts: {
      minX: number;
      minY: number;
      maxX: number;
      maxY: number;
      paddingPx: number;
      clampScale?: { min: number; max: number };
    }) => {
      const vw = args.stageSize.w;
      const vh = args.stageSize.h;

      const w = Math.max(1e-6, opts.maxX - opts.minX);
      const h = Math.max(1e-6, opts.maxY - opts.minY);

      const availW = Math.max(1, vw - opts.paddingPx * 2);
      const availH = Math.max(1, vh - opts.paddingPx * 2);

      const clampScale = opts.clampScale ?? clampScaleRange;

      let nextScale = Math.min(availW / w, availH / h);
      nextScale = Math.max(clampScale.min, Math.min(clampScale.max, nextScale));

      const cxWorld = (opts.minX + opts.maxX) / 2;
      const cyWorld = (opts.minY + opts.maxY) / 2;

      const cxScreen = vw / 2;
      const cyScreen = vh / 2;

      const nextPos = {
        x: cxScreen - cxWorld * nextScale,
        y: cyScreen - cyWorld * nextScale,
      };

      args.setStageScale(nextScale);
      setStagePosSmart(nextPos);
    },
    [args.stageSize.w, args.stageSize.h, args.setStageScale, setStagePosSmart, clampScaleRange]
  );

  const zoomTo100 = useCallback(() => {
    const newScale = 1;

    const cx = args.stageSize.w / 2;
    const cy = args.stageSize.h / 2;

    const liveScale = getLiveScale();
    const worldX = (cx - args.stagePos.x) / liveScale;
    const worldY = (cy - args.stagePos.y) / liveScale;

    const nextPos = {
      x: cx - worldX * newScale,
      y: cy - worldY * newScale,
    };

    args.setStageScale(newScale);
    setStagePosSmart(nextPos);
  }, [args.stageSize.w, args.stageSize.h, args.stagePos.x, args.stagePos.y, getLiveScale, args.setStageScale, setStagePosSmart]);

  const fitPlotToViewport = useCallback(
    (paddingPx = 110) => {
      setCameraToWorldRect({
        minX: 0,
        minY: 0,
        maxX: args.plotW,
        maxY: args.plotH,
        paddingPx,
        clampScale: { min: 0.05, max: 3.5 },
      });
    },
    [setCameraToWorldRect, args.plotW, args.plotH]
  );

  const zoomToSelection = useCallback(
    (selectedItems: Array<{ x: number; y: number; w: number; h: number; r?: number }>, paddingPx = 120) => {
      if (!selectedItems.length) return;

      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;

      for (const it of selectedItems) {
        const b = boundsOfRotatedRect(it);
        if (b.minX < minX) minX = b.minX;
        if (b.minY < minY) minY = b.minY;
        if (b.maxX > maxX) maxX = b.maxX;
        if (b.maxY > maxY) maxY = b.maxY;
      }

      setCameraToWorldRect({
        minX,
        minY,
        maxX,
        maxY,
        paddingPx,
        clampScale: { min: 0.08, max: 8 },
      });
    },
    [setCameraToWorldRect]
  );

  return useMemo(
    () => ({
      clampStagePosToPlot,
      setStagePosSmart,
      worldFromScreen,
      screenFromWorld,
      setCameraToWorldRect,
      zoomTo100,
      fitPlotToViewport,
      zoomToSelection,
    }),
    [
      clampStagePosToPlot,
      setStagePosSmart,
      worldFromScreen,
      screenFromWorld,
      setCameraToWorldRect,
      zoomTo100,
      fitPlotToViewport,
      zoomToSelection,
    ]
  );
}