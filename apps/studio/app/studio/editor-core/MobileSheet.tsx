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

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-80">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
      />

      {/* Sheet */}
      <div
        className={[
          "absolute inset-x-0 bottom-0",
          "rounded-t-3xl border border-black/10 bg-white/95 shadow-2xl backdrop-blur",
          heightClassName ?? "h-[70dvh]",
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
            className="rounded-full px-3 py-1 text-sm text-black/70 hover:bg-black/5"
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