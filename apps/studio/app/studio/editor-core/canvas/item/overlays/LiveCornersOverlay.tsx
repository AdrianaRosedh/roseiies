"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Circle, Group } from "react-konva";
import type Konva from "konva";
import type { CornerRadii } from "../../../types";

/* ---------------- Utils ---------------- */

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/* ---------------- Live Corners Overlay ---------------- */

export default function LiveCornersOverlay(props: {
  w: number;
  h: number;
  rectRef: React.RefObject<Konva.Rect | null>;
  currentUniformRadius: number;
  cornerRadii?: CornerRadii;
  onCommit: (next: { uniform: number } | { corners: CornerRadii }) => void;
}) {
  const rMax = Math.min(props.w, props.h) / 2;

  const [perCorner, setPerCorner] = useState<boolean>(Boolean(props.cornerRadii));
  const [draftUniform, setDraftUniform] = useState(props.currentUniformRadius);

  useEffect(() => {
    setPerCorner(Boolean(props.cornerRadii));
    setDraftUniform(props.currentUniformRadius);
  }, [props.currentUniformRadius, props.cornerRadii]);

  const corners = useMemo(() => {
    return (
      props.cornerRadii ?? {
        tl: props.currentUniformRadius,
        tr: props.currentUniformRadius,
        br: props.currentUniformRadius,
        bl: props.currentUniformRadius,
      }
    );
  }, [props.cornerRadii, props.currentUniformRadius]);

  const handlePad = 14;

  function setRectCornerRadiusLive(cr: any) {
    const r = props.rectRef.current as any;
    if (!r) return;
    r.cornerRadius(cr);
    r.getLayer()?.batchDraw();
  }

  function commitUniform(r: number) {
    props.onCommit({ uniform: clamp(r, 0, rMax) });
  }

  function commitCorners(next: CornerRadii) {
    props.onCommit({
      corners: {
        tl: clamp(next.tl, 0, rMax),
        tr: clamp(next.tr, 0, rMax),
        br: clamp(next.br, 0, rMax),
        bl: clamp(next.bl, 0, rMax),
      },
    });
  }

  // Uniform handle position
  const uniR = clamp(draftUniform, 0, rMax);
  const hx = clamp(props.w - handlePad - uniR, 18, props.w - 18);
  const hy = clamp(handlePad + uniR, 18, Math.min(60, props.h - 18));

  if (!perCorner) {
    return (
      <Group listening>
        <Circle
          x={hx}
          y={hy}
          radius={6}
          fill="rgba(255,255,255,0.98)"
          stroke="rgba(111, 102, 255, 0.70)"
          strokeWidth={1.2}
          shadowColor="rgba(111, 102, 255, 0.22)"
          shadowBlur={10}
          shadowOffsetX={0}
          shadowOffsetY={6}
          draggable
          onDblClick={() => setPerCorner(true)}
          onDragMove={(e) => {
            const x = e.target.x();
            const y = e.target.y();
            const dx = props.w - handlePad - x;
            const dy = y - handlePad;
            const next = clamp(Math.max(dx, dy), 0, rMax);

            setDraftUniform(next);
            setRectCornerRadiusLive(next); // live
          }}
          onDragEnd={() => {
            commitUniform(draftUniform);
            setRectCornerRadiusLive(draftUniform);
          }}
        />
      </Group>
    );
  }

  const per = {
    tl: clamp(corners.tl, 0, rMax),
    tr: clamp(corners.tr, 0, rMax),
    br: clamp(corners.br, 0, rMax),
    bl: clamp(corners.bl, 0, rMax),
  };

  const perHandles = [
    { key: "tl", x: handlePad + per.tl, y: handlePad + per.tl },
    { key: "tr", x: props.w - handlePad - per.tr, y: handlePad + per.tr },
    { key: "br", x: props.w - handlePad - per.br, y: props.h - handlePad - per.br },
    { key: "bl", x: handlePad + per.bl, y: props.h - handlePad - per.bl },
  ] as const;

  function updateCornerLive(next: CornerRadii) {
    setRectCornerRadiusLive([next.tl, next.tr, next.br, next.bl] as any);
  }

  return (
    <Group listening>
      {perHandles.map((h) => (
        <Circle
          key={h.key}
          x={h.x}
          y={h.y}
          radius={5.8}
          fill="rgba(255,255,255,0.98)"
          stroke="rgba(111, 102, 255, 0.70)"
          strokeWidth={1.2}
          shadowColor="rgba(111, 102, 255, 0.20)"
          shadowBlur={10}
          shadowOffsetX={0}
          shadowOffsetY={6}
          draggable
          onDblClick={() => {
            const avg = (per.tl + per.tr + per.br + per.bl) / 4;
            setPerCorner(false);
            setDraftUniform(avg);
            setRectCornerRadiusLive(avg);
            commitUniform(avg);
          }}
          onDragMove={(e) => {
            const x = e.target.x();
            const y = e.target.y();

            const next: CornerRadii = { ...per };

            if (h.key === "tl") {
              next.tl = clamp(Math.max(x - handlePad, y - handlePad), 0, rMax);
            } else if (h.key === "tr") {
              next.tr = clamp(Math.max(props.w - handlePad - x, y - handlePad), 0, rMax);
            } else if (h.key === "br") {
              next.br = clamp(Math.max(props.w - handlePad - x, props.h - handlePad - y), 0, rMax);
            } else if (h.key === "bl") {
              next.bl = clamp(Math.max(x - handlePad, props.h - handlePad - y), 0, rMax);
            }

            updateCornerLive(next);
          }}
          onDragEnd={() => {
            const r = props.rectRef.current as any;
            const cr = r?.cornerRadius?.();
            if (Array.isArray(cr) && cr.length === 4) {
              commitCorners({ tl: cr[0], tr: cr[1], br: cr[2], bl: cr[3] });
            } else {
              commitCorners(per);
            }
          }}
        />
      ))}
    </Group>
  );
}
