// apps/studio/app/studio/editor-core/ui/Modal.tsx
"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

export default function Modal({
  open,
  title,
  description,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  description?: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-10000 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/25 backdrop-blur-[2px]"
        onMouseDown={onClose}
      />
      <div className="relative w-[min(520px,92vw)] rounded-2xl border border-black/10 bg-white/85 shadow-xl backdrop-blur px-5 py-4">
        <div className="text-sm font-semibold">{title}</div>
        {description ? (
          <div className="mt-1 text-xs text-black/55">{description}</div>
        ) : null}

        <div className="mt-4">{children}</div>
      </div>
    </div>,
    document.body
  );
}
