"use client";

import { useEffect, useRef, useState } from "react";

export default function MobileSheet(props: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  heightClassName?: string;
}) {
  const [mounted, setMounted] = useState(props.open);
  const closeTimer = useRef<number | null>(null);

  useEffect(() => {
    if (props.open) {
      if (closeTimer.current) window.clearTimeout(closeTimer.current);
      setMounted(true);
      return;
    }
    closeTimer.current = window.setTimeout(() => setMounted(false), 220);
    return () => {
      if (closeTimer.current) window.clearTimeout(closeTimer.current);
    };
  }, [props.open]);

  if (!mounted) return null;

  const open = props.open;

  return (
    <div className="absolute inset-0 z-30">
      <button
        type="button"
        className={[
          "absolute inset-0 bg-black/15 transition-opacity duration-200",
          open ? "opacity-100" : "opacity-0",
        ].join(" ")}
        onClick={props.onClose}
        aria-label="Close sheet"
        style={{ touchAction: "none" }}
      />

      <div
        className={[
          "absolute left-0 right-0 bottom-0 mx-auto max-w-175",
          "rounded-t-3xl border border-black/10 bg-white shadow-2xl",
          "transition-transform duration-200 will-change-transform",
          open ? "translate-y-0" : "translate-y-3",
          props.heightClassName ?? "h-[52vh]",
        ].join(" ")}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="px-4 pt-3 pb-2 flex items-center justify-between">
          <div className="text-sm font-semibold text-black/85">{props.title}</div>
          <button
            type="button"
            onClick={props.onClose}
            className="h-9 w-9 inline-flex items-center justify-center rounded-xl border border-black/10 bg-white/80 hover:bg-white"
            aria-label="Close"
            title="Close"
          >
            <IconX />
          </button>
        </div>
        <div className="h-px bg-black/10" />
        <div className="h-full overflow-hidden">{props.children}</div>
      </div>
    </div>
  );
}

function IconX() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M5 5l10 10M15 5L5 15"
        stroke="rgba(15,23,42,0.7)"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
