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
  const [vh, setVh] = useState<number>(typeof window === "undefined" ? 800 : window.innerHeight);

  const dragRef = useRef<{ startY: number; dragging: boolean } | null>(null);

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
    dragRef.current = { startY: e.clientY, dragging: true };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const st = dragRef.current;
    if (!st?.dragging) return;

    const dy = e.clientY - st.startY;

    if (dy > 40) {
      if (snap === "large") setAndNotify("medium");
      else if (snap === "medium") setAndNotify("collapsed");
    } else if (dy < -40) {
      if (snap === "collapsed") setAndNotify("medium");
      else if (snap === "medium") setAndNotify("large");
    }
  };

  const onPointerUp = () => {
    if (dragRef.current) dragRef.current.dragging = false;
  };

  if (!props.open) return null;

  return (
    // ✅ FIXED overlay — not part of layout
    <div className="fixed inset-x-0 bottom-0 z-80 pointer-events-none">
      <div
        className="pointer-events-auto mx-auto w-[min(980px,100%)] px-3 pb-3"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 12px)" }}
      >
        <div
          className="rounded-[28px] border border-(--rose-border) bg-(--rose-surface)/92 backdrop-blur shadow-sm overflow-hidden"
          style={{ height }}
        >
          <div
            className="flex items-center justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing"
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
                {props.subtitle ? <div className="text-xs text-(--rose-muted)">{props.subtitle}</div> : null}
                {props.title ? <div className="mt-1 text-lg font-semibold text-(--rose-ink)">{props.title}</div> : null}
              </div>
            )}

            {props.children}
          </div>
        </div>
      </div>
    </div>
  );
}
