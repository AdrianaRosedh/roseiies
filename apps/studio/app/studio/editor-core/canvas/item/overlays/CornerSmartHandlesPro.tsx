// apps/studio/app/studio/editor-core/canvas/item/overlays/CornerSmartHandlesPro.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Group, Circle, Text } from "react-konva";
import type Konva from "konva";

/* ---------------- Utils ---------------- */

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

/* ---------------- Component ---------------- */

export default function CornerSmartHandlesPro(props: {
  w: number;
  h: number;
  groupRef: React.RefObject<Konva.Group | null>;
  minSize: number;
  setWrapCursor: (cursor: string) => void;
  onSelectionUI: () => void;
  onCommit: (patch: { x?: number; y?: number; w?: number; h?: number; r?: number }) => void;
  isCoarse: boolean;
  lockAspect?: boolean;
}) {
  // ✅ smaller knobs
  const BASE_KNOB_R = props.isCoarse ? 7 : 5;

  // ✅ make rotation easy: larger ring + generous hit
  const BASE_ROTATE_RING = props.isCoarse ? 44 : 34;

  // generous stable hit target
  const HIT = props.isCoarse ? 34 : 26;

  // width of the rotation donut (between knob and ring)
  const ROTATE_GAP = props.isCoarse ? 10 : 8;

  const corners = useMemo(
    () =>
      [
        { key: "tl", x: 0, y: 0 },
        { key: "tr", x: props.w, y: 0 },
        { key: "br", x: props.w, y: props.h },
        { key: "bl", x: 0, y: props.h },
      ] as const,
    [props.w, props.h]
  );

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

  const knobRefs = useRef<Record<string, Konva.Circle | null>>({});
  const ringRefs = useRef<Record<string, Konva.Circle | null>>({});

  const stagePointerWorld = useCallback((): { x: number; y: number } | null => {
    const g = props.groupRef.current;
    const stage = g?.getStage();
    return stage?.getPointerPosition() ?? null;
  }, [props.groupRef]);

  const parentInvTransform = useCallback((): Konva.Transform | null => {
    const g = props.groupRef.current;
    if (!g) return null;
    const parent = g.getParent();
    if (!parent) return null;
    return parent.getAbsoluteTransform().copy().invert();
  }, [props.groupRef]);

  const pointerParent = useCallback((): { x: number; y: number } | null => {
    const pW = stagePointerWorld();
    if (!pW) return null;
    const inv = parentInvTransform();
    return inv ? inv.point(pW) : pW;
  }, [stagePointerWorld, parentInvTransform]);

  const pointerToLocal = useCallback((): { x: number; y: number } | null => {
    const g = props.groupRef.current;
    const pW = stagePointerWorld();
    if (!g || !pW) return null;
    const inv = g.getAbsoluteTransform().copy().invert();
    return inv.point(pW);
  }, [props.groupRef, stagePointerWorld]);

  function cornerDist(local: { x: number; y: number }, corner: { x: number; y: number }) {
    return Math.hypot(local.x - corner.x, local.y - corner.y);
  }

  function cursorForCornerResize(c: CornerKey) {
    return c === "tl" || c === "br" ? "nwse-resize" : "nesw-resize";
  }

  function expectedSignsForCorner(c: CornerKey) {
    if (c === "br") return { sx: +1, sy: +1 }; // fixed tl
    if (c === "tr") return { sx: +1, sy: -1 }; // fixed bl
    if (c === "bl") return { sx: -1, sy: +1 }; // fixed tr
    return { sx: -1, sy: -1 }; // tl fixed br
  }

  // ✅ keep circles round + constant size during preview scaling
  const syncHandleScale = useCallback(() => {
    const g = props.groupRef.current;
    if (!g) return;

    const sx = g.scaleX() || 1;
    const sy = g.scaleY() || 1;

    const invX = 1 / sx;
    const invY = 1 / sy;

    for (const c of corners) {
      const knob = knobRefs.current[c.key];
      const ring = ringRefs.current[c.key];

      if (knob) {
        knob.scaleX(invX);
        knob.scaleY(invY);
        knob.radius(BASE_KNOB_R);
        knob.strokeWidth(1.2);
        knob.hitStrokeWidth(HIT);
      }
      if (ring) {
        ring.scaleX(invX);
        ring.scaleY(invY);
        ring.radius(BASE_ROTATE_RING);
        ring.hitStrokeWidth(HIT);
      }
    }
  }, [props.groupRef, corners, BASE_KNOB_R, BASE_ROTATE_RING, HIT]);

  const dragRef = useRef<{
    mode: DragMode;
    corner: CornerKey;
    startW: number;
    startH: number;
    startRotation: number;
    fixedCornerP: { x: number; y: number };
    previewCenterP: { x: number; y: number };
    exp: { sx: number; sy: number };
    startPointerP: { x: number; y: number };
  } | null>(null);

  const cleanupRef = useRef<(() => void) | null>(null);

  function endDrag(commit: boolean) {
    const g = props.groupRef.current;
    const st = dragRef.current;

    dragRef.current = null;
    setHoverRotateCorner(null);
    props.setWrapCursor("default");

    if (cleanupRef.current) cleanupRef.current();
    cleanupRef.current = null;

    if (!g || !st) return;

    g.draggable(true);

    if (!commit) {
      g.rotation(st.startRotation);
      g.scaleX(1);
      g.scaleY(1);
      g.position(st.previewCenterP);

      syncHandleScale();
      g.getLayer()?.batchDraw();
      props.onSelectionUI();
      return;
    }

    const sx = Math.abs(g.scaleX());
    const sy = Math.abs(g.scaleY());

    const nextW = Math.max(props.minSize, st.startW * sx);
    const nextH = Math.max(props.minSize, st.startH * sy);

    const centerP = g.position();

    g.scaleX(1);
    g.scaleY(1);

    syncHandleScale();
    g.getLayer()?.batchDraw();
    props.onSelectionUI();

    props.onCommit({
      x: centerP.x - nextW / 2,
      y: centerP.y - nextH / 2,
      w: nextW,
      h: nextH,
      r: g.rotation(),
    });
  }

  function beginDrag(mode: DragMode, corner: CornerKey) {
    const g = props.groupRef.current;
    const stage = g?.getStage();
    if (!g || !stage) return;

    const pP = pointerParent();
    if (!pP) return;

    const centerP = g.position();
    const exp = expectedSignsForCorner(corner);

    const fixedLocal = { x: -(props.w / 2) * exp.sx, y: -(props.h / 2) * exp.sy };
    const fixedCornerP = {
      x: centerP.x + rotateVec(fixedLocal, g.rotation()).x,
      y: centerP.y + rotateVec(fixedLocal, g.rotation()).y,
    };

    dragRef.current = {
      mode,
      corner,
      startW: props.w,
      startH: props.h,
      startRotation: g.rotation(),
      fixedCornerP,
      previewCenterP: centerP,
      exp,
      startPointerP: pP,
    };

    g.draggable(false);

    // ✅ no custom cursor for rotate; ring + badge is the affordance
    if (mode === "rotate") props.setWrapCursor("default");
    if (mode === "resize") props.setWrapCursor(cursorForCornerResize(corner));

    syncHandleScale();

    const NS = ".cornerHandlesRotateClean";

    const onMove = () => {
      const st = dragRef.current;
      if (!st) return;

      if (st.mode === "rotate") {
        const pNowP = pointerParent();
        if (!pNowP) return;

        const cP = st.previewCenterP;
        const now = (Math.atan2(pNowP.y - cP.y, pNowP.x - cP.x) * 180) / Math.PI;
        const start =
          (Math.atan2(st.startPointerP.y - cP.y, st.startPointerP.x - cP.x) * 180) / Math.PI;
        const delta = normalizeAngleDelta(now - start);

        let nextRot = st.startRotation + delta;
        if (shiftDownRef.current) nextRot = Math.round(nextRot / 15) * 15;

        g.rotation(nextRot);
        syncHandleScale();

        g.getLayer()?.batchDraw();
        props.onSelectionUI();
        return;
      }

      if (st.mode === "resize") {
        const pNowP = pointerParent();
        if (!pNowP) return;

        const vP = { x: pNowP.x - st.fixedCornerP.x, y: pNowP.y - st.fixedCornerP.y };
        const vLocal = rotateVec(vP, -st.startRotation);

        let nextW = Math.max(props.minSize, Math.abs(vLocal.x));
        let nextH = Math.max(props.minSize, Math.abs(vLocal.y));

        if (props.lockAspect) {
          const m = Math.max(nextW, nextH);
          nextW = m;
          nextH = m;
        }

        g.scaleX(nextW / st.startW);
        g.scaleY(nextH / st.startH);

        syncHandleScale();

        const centerOffsetLocal = { x: st.exp.sx * (nextW / 2), y: st.exp.sy * (nextH / 2) };
        const centerOffsetP = rotateVec(centerOffsetLocal, st.startRotation);
        const nextCenterP = {
          x: st.fixedCornerP.x + centerOffsetP.x,
          y: st.fixedCornerP.y + centerOffsetP.y,
        };

        g.position(nextCenterP);
        st.previewCenterP = nextCenterP;

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
    syncHandleScale();
    return () => endDrag(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Group listening>
      {corners.map((c) => {
        const rotateInner = BASE_KNOB_R + ROTATE_GAP;
        const rotateOuter = BASE_ROTATE_RING + 6;

        const rotateHot = hoverRotateCorner === c.key;

        return (
          <Group key={c.key}>
            {/* Rotation ring hit zone (invisible fill, visible stroke on hover) */}
            <Circle
              ref={(n) => {
                ringRefs.current[c.key] = n;
              }}
              x={c.x}
              y={c.y}
              radius={BASE_ROTATE_RING}
              fill="rgba(0,0,0,0.001)"
              listening
              perfectDrawEnabled={false}
              hitStrokeWidth={HIT}
              stroke={rotateHot ? "rgba(111,102,255,0.55)" : "rgba(0,0,0,0)"}
              strokeWidth={rotateHot ? 2.2 : 0}
              dash={rotateHot ? [6, 6] : undefined}
              onMouseMove={() => {
                if (dragRef.current) return;

                const local = pointerToLocal();
                if (!local) return;

                const d = cornerDist(local, c);

                // if near knob -> resize cursor
                if (d <= BASE_KNOB_R + 2) {
                  setHoverRotateCorner(null);
                  props.setWrapCursor(cursorForCornerResize(c.key));
                  return;
                }

                // if in outer ring -> rotate affordance (no special cursor)
                if (d >= rotateInner && d <= rotateOuter) {
                  setHoverRotateCorner(c.key);
                  props.setWrapCursor("default");
                  return;
                }

                setHoverRotateCorner(null);
                props.setWrapCursor("default");
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
                if (d >= rotateInner && d <= rotateOuter) beginDrag("rotate", c.key);
              }}
              onTouchStart={(e) => {
                e.cancelBubble = true;
                if (dragRef.current) return;

                const local = pointerToLocal();
                if (!local) return;

                const d = cornerDist(local, c);
                if (d >= rotateInner && d <= rotateOuter) beginDrag("rotate", c.key);
                else if (d <= BASE_KNOB_R + 3) beginDrag("resize", c.key);
              }}
            />

            {/* Small rotate badge (visual affordance; not a cursor) */}
            {rotateHot ? (
              <Group x={c.x + 14} y={c.y - 14} listening={false}>
                <Circle
                  x={0}
                  y={0}
                  radius={8}
                  fill="rgba(255,255,255,0.92)"
                  stroke="rgba(111,102,255,0.25)"
                  strokeWidth={1}
                  listening={false}
                />
                <Text
                  x={-6}
                  y={-7}
                  text="↻"
                  fontSize={12}
                  fill="rgba(15,23,42,0.65)"
                  listening={false}
                />
              </Group>
            ) : null}

            {/* Resize knob (always consistent; no weird hover morph) */}
            <Circle
              ref={(n) => {
                knobRefs.current[c.key] = n;
              }}
              x={c.x}
              y={c.y}
              radius={BASE_KNOB_R}
              fill="rgba(255,255,255,0.92)"
              stroke="rgba(111,102,255,0.55)"
              strokeWidth={1.2}
              listening
              perfectDrawEnabled={false}
              hitStrokeWidth={HIT}
              onMouseDown={(e) => {
                e.cancelBubble = true;
                if (dragRef.current) return;
                beginDrag("resize", c.key);
              }}
              onMouseEnter={() => {
                if (!dragRef.current) props.setWrapCursor(cursorForCornerResize(c.key));
              }}
              onMouseLeave={() => {
                if (!dragRef.current) props.setWrapCursor("default");
              }}
            />
          </Group>
        );
      })}
    </Group>
  );
}
