"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type Snap = "collapsed" | "medium" | "large";

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function snapHeights(vh: number) {
  // ✅ leave a top gap even at "large"
  const collapsed = Math.max(120, Math.round(vh * 0.18));
  const medium = Math.max(360, Math.round(vh * 0.50));
  const large = Math.max(560, Math.round(vh * 0.88)); // ✅ never hits top
  return { collapsed, medium, large };
}

function nearestSnap(px: number, snaps: Record<Snap, number>): Snap {
  const entries: Array<[Snap, number]> = Object.entries(snaps) as any;
  let best: Snap = "medium";
  let bestD = Infinity;
  for (const [k, v] of entries) {
    const d = Math.abs(px - v);
    if (d < bestD) {
      bestD = d;
      best = k;
    }
  }
  return best;
}

export default function BottomSheet(props: {
  open: boolean;
  snap: Snap;
  onSnapChange: (s: Snap) => void;

  title?: string;
  subtitle?: string;

  header?: React.ReactNode;
  children: React.ReactNode;

  // ✅ smart footer: bottom when short, only visible at end when long
  footer?: React.ReactNode;
}) {
  const [vh, setVh] = useState<number>(
    typeof window === "undefined" ? 800 : window.innerHeight
  );

  useEffect(() => {
    const onResize = () => setVh(window.innerHeight);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const snaps = useMemo(() => snapHeights(vh), [vh]);
  const [heightPx, setHeightPx] = useState<number>(() => snaps[props.snap]);

  useEffect(() => {
    setHeightPx(snaps[props.snap]);
  }, [props.snap, snaps]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") props.onSnapChange("collapsed");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [props]);

  const dragRef = useRef<{ startY: number; startH: number; dragging: boolean } | null>(
    null
  );

  const onPointerDown = (e: React.PointerEvent) => {
    dragRef.current = { startY: e.clientY, startH: heightPx, dragging: true };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const st = dragRef.current;
    if (!st?.dragging) return;

    const dy = e.clientY - st.startY;
    const next = st.startH - dy;

    const minH = snaps.collapsed;

    // ✅ never hit the top: keep a small margin
    const topMargin = 16;
    const maxH = Math.max(minH, vh - topMargin);

    setHeightPx(clamp(next, minH, maxH));
  };

  const onPointerUp = () => {
    const st = dragRef.current;
    if (!st) return;
    st.dragging = false;
    props.onSnapChange(nearestSnap(heightPx, snaps));
  };

  if (!props.open) return null;

  const border = "rgba(15, 23, 42, 0.12)";
  const surface = "rgba(255,255,255,0.86)";
  const surfaceTop = "rgba(255,255,255,0.92)";
  const ink = "rgba(15, 23, 42, 0.92)";
  const muted = "rgba(15, 23, 42, 0.58)";

  const headerH = 104;

  return (
    <div
      className="pointer-events-none"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 80,
        paddingLeft: 12,
        paddingRight: 12,
        paddingBottom: "max(env(safe-area-inset-bottom), 12px)",
      }}
    >
      <div
        className="pointer-events-auto"
        style={{
          height: heightPx,
          borderRadius: 26,
          border: `1px solid ${border}`,
          background: surface,
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          boxShadow: "0 22px 50px rgba(0,0,0,0.12)",
          overflow: "hidden",
          transition: dragRef.current?.dragging ? "none" : "height 180ms ease",
        }}
      >
        {/* Header */}
        <div style={{ background: surfaceTop, borderBottom: `1px solid ${border}` }}>
          <div
            style={{
              paddingTop: 10,
              paddingBottom: 12,
              paddingLeft: 14,
              paddingRight: 14,
              touchAction: "none",
              cursor: "grab",
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <div
              style={{
                width: 44,
                height: 5,
                borderRadius: 999,
                background: "rgba(15,23,42,0.18)",
                margin: "0 auto",
              }}
            />

            <div style={{ marginTop: 10 }}>
              {props.header ? (
                props.header
              ) : (
                <div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: ink }}>
                    {props.title ?? ""}
                  </div>
                  {props.subtitle ? (
                    <div style={{ fontSize: 12, color: muted, marginTop: 3 }}>
                      {props.subtitle}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Scroll area */}
        <div
          style={{
            height: heightPx - headerH,
            overflowY: "auto",
            padding: 14,
          }}
        >
          {/* ✅ smart layout wrapper:
              - if content is short, footer sits at bottom via marginTop:auto
              - if content is long, footer is only visible at end of scroll */}
          <div style={{ minHeight: "100%", display: "flex", flexDirection: "column" }}>
            {props.children}

            {props.footer ? (
              <div style={{ marginTop: "auto", paddingTop: 18 }}>
                {props.footer}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
