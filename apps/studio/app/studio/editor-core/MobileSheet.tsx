"use client";

import * as React from "react";

export default function MobileSheet(props: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  heightClassName?: string; // e.g. "h-[70dvh]" or "h-dvh"
}) {
  const { open, title, onClose, children, heightClassName } = props;

  // Keep mounted long enough to animate closed
  const [present, setPresent] = React.useState(open);

  React.useEffect(() => {
    if (open) setPresent(true);
    else {
      const t = window.setTimeout(() => setPresent(false), 220);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!present) return null;

  return (
    <div className="fixed inset-0 z-80">
      {/* ✅ NO overlay / blur — just a transparent click-catcher */}
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-transparent"
      />

      {/* Sheet */}
      <div
        className={[
          "absolute inset-x-0 bottom-0",
          "rounded-t-3xl border border-black/10 bg-white/95 shadow-2xl backdrop-blur",
          heightClassName ?? "h-[70dvh]",
          // ✅ smooth motion
          "transition-all duration-200 ease-out",
          open ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
        ].join(" ")}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-10 rounded-full bg-black/10" />
            <div className="text-sm font-medium text-black/70">{title}</div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-3 py-1 text-sm text-black/70 hover:bg-black/5 transition"
          >
            Close
          </button>
        </div>

        <div className="h-[calc(100%-52px)] overflow-auto px-4 pb-6">
          {children}
        </div>
      </div>
    </div>
  );
}
