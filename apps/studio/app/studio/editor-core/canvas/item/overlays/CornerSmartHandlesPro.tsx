"use client";

import React, { useEffect, useRef, useState } from "react";
import { Group, Circle } from "react-konva";
import type Konva from "konva";

/* ---------------- Utils ---------------- */

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function cursorSvgDataUri(svg: string) {
  const encoded = encodeURIComponent(svg).replace(/'/g, "%27").replace(/"/g, "%22");
  return `url("data:image/svg+xml,${encoded}")`;
}

// 32x32 cursor, hotspot at center (16,16)
const ROTATE_CURSOR =
  cursorSvgDataUri(`
  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32">
    <g fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M16 6a10 10 0 1 1-7.1 2.9"/>
      <path d="M8.9 8.9L8 4.5l4.4.9"/>
    </g>
    <g fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.95">
      <path d="M16 6a10 10 0 1 1-7.1 2.9"/>
      <path d="M8.9 8.9L8 4.5l4.4.9"/>
    </g>
  </svg>
`) + " 16 16, auto";

/** Keep delta in [-180, 180] to prevent wrap jumps */
function normalizeAngleDelta(delta: number) {
  let d = delta;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return d;
}

function rotateVec(v: { x: number; y: number }, deg: number) {
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return { x: v.x * c - v.y * s, y: v.x * s + v.y * c };
}

/* ---------------- Corner Handles (stable, commit-only) ---------------- */

export default function CornerSmartHandlesPro(props: {
  w: number;
  h: number;
  groupRef: React.RefObject<Konva.Group | null>;
  minSize: number;
  setWrapCursor: (cursor: string) => void;
  onSelectionUI: () => void;
  onCommit: (patch: { x?: number; y?: number; w?: number; h?: number; r?: number }) => void;
  isCoarse: boolean;

  // ✅ keep aspect ratio (perfect for trees)
  lockAspect?: boolean;
}) {
  const knobR = props.isCoarse ? 9 : 6;
  const rotateRing = props.isCoarse ? 28 : 18;
  const hitStroke = props.isCoarse ? rotateRing * 2.4 : rotateRing * 2;

  const corners = [
    { key: "tl", x: 0, y: 0 },
    { key: "tr", x: props.w, y: 0 },
    { key: "br", x: props.w, y: props.h },
    { key: "bl", x: 0, y: props.h },
  ] as const;

  type CornerKey = (typeof corners)[number]["key"];
  type DragMode = "none" | "rotate" | "resize";

  const [hoverRotateCorner, setHoverRotateCorner] = useState<CornerKey | null>(null);

  const shiftDownRef = useRef(false);
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "Shift") shiftDownRef.current = true;
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === "Shift") shiftDownRef.current = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  const dragRef = useRef<{
    mode: DragMode;
    corner: CornerKey;

    startW: number;
    startH: number;
    startRotation: number;

    startCenterWorld: { x: number; y: number };
    startCenterParent: { x: number; y: number };
    startAngleParent: number;

    startScaleX: number;
    startScaleY: number;
    startAbsPos: { x: number; y: number };
  } | null>(null);

  const cleanupRef = useRef<(() => void) | null>(null);

  function stagePointerWorld(): { x: number; y: number } | null {
    const g = props.groupRef.current;
    const stage = g?.getStage();
    return stage?.getPointerPosition() ?? null;
  }

  function parentInvTransform(): Konva.Transform | null {
    const g = props.groupRef.current;
    if (!g) return null;
    const parent = g.getParent();
    if (!parent) return null;
    return parent.getAbsoluteTransform().copy().invert();
  }

  function pointerParent(): { x: number; y: number } | null {
    const g = props.groupRef.current;
    if (!g) return null;
    const pW = stagePointerWorld();
    if (!pW) return null;
    const inv = parentInvTransform();
    return inv ? inv.point(pW) : pW;
  }

  function centerWorld(): { x: number; y: number } | null {
    const g = props.groupRef.current;
    if (!g) return null;
    const t = g.getAbsoluteTransform();
    return t.point({ x: props.w / 2, y: props.h / 2 });
  }

  function centerParent(): { x: number; y: number } | null {
    const cW = centerWorld();
    if (!cW) return null;
    const inv = parentInvTransform();
    return inv ? inv.point(cW) : cW;
  }

  function angleDeg(a: { x: number; y: number }, c: { x: number; y: number }) {
    return (Math.atan2(a.y - c.y, a.x - c.x) * 180) / Math.PI;
  }

  function pointerToLocal(): { x: number; y: number } | null {
    const g = props.groupRef.current;
    const pW = stagePointerWorld();
    if (!g || !pW) return null;
    const inv = g.getAbsoluteTransform().copy().invert();
    return inv.point(pW);
  }

  function isOutsideRect(local: { x: number; y: number }, pad = 2) {
    return local.x < -pad || local.y < -pad || local.x > props.w + pad || local.y > props.h + pad;
  }

  function cornerDist(local: { x: number; y: number }, corner: { x: number; y: number }) {
    return Math.hypot(local.x - corner.x, local.y - corner.y);
  }

  function cursorForCornerResize(c: CornerKey) {
    if (c === "tl" || c === "br") return "nwse-resize";
    return "nesw-resize";
  }

  // Rock-solid center lock in WORLD space (no drift, no jump)
  function forceCenterLock(g: Konva.Group, desiredCenterWorld: { x: number; y: number }) {
    const t = g.getAbsoluteTransform();
    const curCenterWorld = t.point({ x: props.w / 2, y: props.h / 2 });

    const dx = desiredCenterWorld.x - curCenterWorld.x;
    const dy = desiredCenterWorld.y - curCenterWorld.y;

    const abs = g.absolutePosition();
    g.absolutePosition({ x: abs.x + dx, y: abs.y + dy });
  }

  // Keep label readable (no squish) — find first Text in group
  const labelRef = useRef<Konva.Text | null>(null);
  function getLabel(g: Konva.Group) {
    if (labelRef.current) return labelRef.current;
    labelRef.current = g.findOne("Text") as Konva.Text | null;
    return labelRef.current;
  }
  function counterScaleLabel(g: Konva.Group) {
    const t = getLabel(g);
    if (!t) return;

    const sx = g.scaleX();
    const sy = g.scaleY();
    if (Math.abs(sx) > 1e-6) t.scaleX(1 / sx);
    if (Math.abs(sy) > 1e-6) t.scaleY(1 / sy);
    t.rotation(-g.rotation());
    t.getLayer()?.batchDraw();
  }

  function endDrag(commit: boolean) {
    const g = props.groupRef.current;
    const st = dragRef.current;

    // clear drag state first (prevents re-entrancy weirdness)
    dragRef.current = null;
    setHoverRotateCorner(null);
    props.setWrapCursor("default");

    // remove listeners
    if (cleanupRef.current) cleanupRef.current();
    cleanupRef.current = null;

    if (!g || !st) return;

    // always re-enable dragging
    g.draggable(true);

    if (!commit) {
      // cancel: restore *exact* start state
      g.rotation(st.startRotation);
      g.scaleX(st.startScaleX);
      g.scaleY(st.startScaleY);
      g.absolutePosition(st.startAbsPos);

      // hard re-lock to original center
      forceCenterLock(g, st.startCenterWorld);

      g.getLayer()?.batchDraw();
      props.onSelectionUI();
      return;
    }

    // commit: bake scale into w/h, keep rotation, compute new top-left from locked center
    const sx = g.scaleX();
    const sy = g.scaleY();

    const nextW = Math.max(props.minSize, st.startW * sx);
    const nextH = Math.max(props.minSize, st.startH * sy);

    // Convert locked world-center -> parent coords (item x/y are parent coords)
    const inv = parentInvTransform();
    const lockedCenterP = inv ? inv.point(st.startCenterWorld) : st.startCenterWorld;

    const nextX = lockedCenterP.x - nextW / 2;
    const nextY = lockedCenterP.y - nextH / 2;
    const finalRot = g.rotation();

    // reset node live scale so React props apply cleanly
    g.scaleX(1);
    g.scaleY(1);

    // keep stable until re-render
    forceCenterLock(g, st.startCenterWorld);

    g.getLayer()?.batchDraw();
    props.onSelectionUI();

    props.onCommit({ x: nextX, y: nextY, w: nextW, h: nextH, r: finalRot });
  }

  function beginDrag(mode: DragMode, corner: CornerKey) {
    const g = props.groupRef.current;
    const stage = g?.getStage();
    if (!g || !stage) return;

    const cW = centerWorld();
    const cP = centerParent();
    const pP = pointerParent();
    if (!cW || !cP || !pP) return;

    dragRef.current = {
      mode,
      corner,
      startW: props.w,
      startH: props.h,
      startRotation: g.rotation(),
      startCenterWorld: cW,
      startCenterParent: cP,
      startAngleParent: angleDeg(pP, cP),
      startScaleX: g.scaleX(),
      startScaleY: g.scaleY(),
      startAbsPos: g.absolutePosition(),
    };

    // prevent the group itself from dragging while manipulating handles
    g.draggable(false);

    if (mode === "rotate") props.setWrapCursor(ROTATE_CURSOR);
    if (mode === "resize") props.setWrapCursor(cursorForCornerResize(corner));

    const NS = ".cornerHandlesPro";

    const onMove = () => {
      const st = dragRef.current;
      if (!st) return;

      if (st.mode === "rotate") {
        const pNowP = pointerParent();
        if (!pNowP) return;

        const now = angleDeg(pNowP, st.startCenterParent);
        const delta = normalizeAngleDelta(now - st.startAngleParent);

        let nextRot = st.startRotation + delta;
        if (shiftDownRef.current) nextRot = Math.round(nextRot / 15) * 15;

        g.rotation(nextRot);
        forceCenterLock(g, st.startCenterWorld);

        g.getLayer()?.batchDraw();
        props.onSelectionUI();
        return;
      }

      if (st.mode === "resize") {
        const pW = stagePointerWorld();
        if (!pW) return;

        // resize from center in local rotation space
        const vWorld = { x: pW.x - st.startCenterWorld.x, y: pW.y - st.startCenterWorld.y };
        const vLocal = rotateVec(vWorld, -st.startRotation);

        let halfW = Math.max(props.minSize / 2, Math.abs(vLocal.x));
        let halfH = Math.max(props.minSize / 2, Math.abs(vLocal.y));

        if (props.lockAspect) {
          const half = Math.max(halfW, halfH);
          halfW = half;
          halfH = half;
        }

        const nextW = halfW * 2;
        const nextH = halfH * 2;

        g.scaleX(nextW / st.startW);
        g.scaleY(nextH / st.startH);

        counterScaleLabel(g);
        forceCenterLock(g, st.startCenterWorld);

        g.getLayer()?.batchDraw();
        props.onSelectionUI();
      }
    };

    const onUp = () => endDrag(true);
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") endDrag(false);
    };

    stage.on(`mousemove${NS} touchmove${NS}`, onMove);
    stage.on(`mouseup${NS} touchend${NS} touchcancel${NS}`, onUp);
    window.addEventListener("keydown", onKey);

    cleanupRef.current = () => {
      stage.off(NS);
      window.removeEventListener("keydown", onKey);
    };
  }

  useEffect(() => {
    return () => endDrag(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Group listening>
      {corners.map((c) => (
        <Group key={c.key}>
          {/* Invisible hover zone for rotation */}
          <Circle
            x={c.x}
            y={c.y}
            radius={rotateRing}
            fill="rgba(0,0,0,0.001)" // must not be fully transparent
            listening
            onMouseMove={() => {
              if (dragRef.current) return;

              const local = pointerToLocal();
              if (!local) return;

              const d = cornerDist(local, c);
              const outside = isOutsideRect(local, 2);

              // For lockAspect items (trees), allow rotate even if inside hit rect
              const canRotateHere = d > knobR + 2 && d <= rotateRing && (props.lockAspect ? true : outside);

              if (canRotateHere) {
                setHoverRotateCorner(c.key);
                props.setWrapCursor(ROTATE_CURSOR);
              } else {
                if (d <= knobR + 2) {
                  setHoverRotateCorner(null);
                  props.setWrapCursor(cursorForCornerResize(c.key));
                } else {
                  setHoverRotateCorner(null);
                  props.setWrapCursor("default");
                }
              }
            }}
            onMouseLeave={() => {
              if (!dragRef.current) props.setWrapCursor("default");
              setHoverRotateCorner(null);
            }}
            onMouseDown={(e) => {
              e.cancelBubble = true;
              if (dragRef.current) return;

              const local = pointerToLocal();
              if (!local) return;

              const d = cornerDist(local, c);
              const outside = isOutsideRect(local, 2);
              const canRotateHere = d > knobR + 2 && d <= rotateRing && (props.lockAspect ? true : outside);

              if (canRotateHere) beginDrag("rotate", c.key);
            }}
            onTouchStart={(e) => {
              e.cancelBubble = true;
              if (dragRef.current) return;

              const local = pointerToLocal();
              if (!local) return;

              const d = cornerDist(local, c);
              const outside = isOutsideRect(local, 2);
              const canRotateHere = d > knobR + 2 && d <= rotateRing && (props.lockAspect ? true : outside);

              if (canRotateHere) beginDrag("rotate", c.key);
            }}
          />

          {/* Rotation ring hint */}
          {hoverRotateCorner === c.key ? (
            <Circle
              x={c.x}
              y={c.y}
              radius={rotateRing}
              stroke="rgba(111, 102, 255, 0.35)"
              strokeWidth={2}
              dash={[6, 6]}
              listening={false}
            />
          ) : null}

          {/* Resize knob */}
          <Circle
            x={c.x}
            y={c.y}
            radius={knobR}
            fill="rgba(255,255,255,0.98)"
            stroke="rgba(111, 102, 255, 0.65)"
            strokeWidth={1.2}
            shadowColor="rgba(111, 102, 255, 0.22)"
            shadowBlur={10}
            shadowOffsetX={0}
            shadowOffsetY={6}
            hitStrokeWidth={hitStroke}
            onMouseMove={() => {
              if (dragRef.current) return;
              props.setWrapCursor(cursorForCornerResize(c.key));
              setHoverRotateCorner(null);
            }}
            onMouseLeave={() => {
              if (!dragRef.current) props.setWrapCursor("default");
            }}
            onMouseDown={(e) => {
              e.cancelBubble = true;
              beginDrag("resize", c.key);
            }}
            onTouchStart={(e) => {
              e.cancelBubble = true;
              beginDrag("resize", c.key);
            }}
          />
        </Group>
      ))}
    </Group>
  );
}
