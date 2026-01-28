// apps/tenant/app/components/garden/viewer/components/BottomSheet.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Snap = "collapsed" | "medium" | "large";

function snapToHeight(vh: number, snap: Snap) {
  if (snap === "collapsed") return Math.max(84, Math.round(vh * 0.12));
  if (snap === "medium") return Math.max(220, Math.round(vh * 0.38));
  return Math.max(340, Math.round(vh * 0.62));
}

export default function BottomSheet(props: {
  open: boolean;
  title?: string;
  subtitle?: string;
  snap?: Snap;
  onSnapChange?: (s: Snap) => void;
  children: React.ReactNode;
}) {
  const [snap, setSnap] = useState<Snap>(props.snap ?? "collapsed");
  const [vh, setVh] = useState<number>(
    typeof window === "undefined" ? 800 : window.innerHeight
  );

  const dragRef = useRef<{
    startY: number;
    dragging: boolean;
    lastSnapAt: number;
  } | null>(null);

  useEffect(() => setSnap(props.snap ?? "collapsed"), [props.snap]);

  useEffect(() => {
    const onResize = () => setVh(window.innerHeight);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const height = useMemo(() => snapToHeight(vh, snap), [vh, snap]);

  const setAndNotify = (s: Snap) => {
    setSnap(s);
    props.onSnapChange?.(s);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    dragRef.current = { startY: e.clientY, dragging: true, lastSnapAt: Date.now() };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const st = dragRef.current;
    if (!st?.dragging) return;

    const dy = e.clientY - st.startY;

    // prevent rapid multi-snap while holding
    const now = Date.now();
    if (now - st.lastSnapAt < 140) return;

    if (dy > 44) {
      if (snap === "large") setAndNotify("medium");
      else if (snap === "medium") setAndNotify("collapsed");
      st.startY = e.clientY; // ✅ reset baseline so it doesn't cascade
      st.lastSnapAt = now;
    } else if (dy < -44) {
      if (snap === "collapsed") setAndNotify("medium");
      else if (snap === "medium") setAndNotify("large");
      st.startY = e.clientY;
      st.lastSnapAt = now;
    }
  };

  const onPointerUp = () => {
    if (dragRef.current) dragRef.current.dragging = false;
  };

  if (!props.open) return null;

  return (
    // ✅ overlay, correct z-index (Tailwind-safe)
    <div className="fixed inset-x-0 bottom-0 z-80 pointer-events-none">

      <div
        className="pointer-events-auto mx-auto w-[min(980px,100%)] px-3 pb-3"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 12px)" }}
      >
        <div
          className="rounded-[28px] border backdrop-blur shadow-sm overflow-hidden"
          style={{
            height,
            borderColor: "var(--rose-border)",
            backgroundColor: "color-mix(in srgb, var(--rose-surface) 92%, transparent)",
          }}
        >
          <div
            className="flex items-center justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing"
            style={{ touchAction: "none" }} // ✅ prevents browser gestures fighting the drag
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <div className="h-1.5 w-12 rounded-full bg-black/15" />
          </div>

          <div className="px-4 pb-4 h-[calc(100%-20px)] overflow-y-auto">
            {(props.title || props.subtitle) && (
              <div className="pb-2">
                {props.subtitle ? (
                  <div className="text-xs" style={{ color: "var(--rose-muted)" }}>
                    {props.subtitle}
                  </div>
                ) : null}
                {props.title ? (
                  <div className="mt-1 text-lg font-semibold" style={{ color: "var(--rose-ink)" }}>
                    {props.title}
                  </div>
                ) : null}
              </div>
            )}

            {props.children}
          </div>
        </div>
      </div>
    </div>
  );
}
