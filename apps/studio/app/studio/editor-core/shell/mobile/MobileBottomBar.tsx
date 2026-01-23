// apps/studio/app/studio/editor-core/shell/mobile/MobileBottomBar.tsx
"use client";

import type { ReactNode } from "react";
import type { MobileSheetKind } from "./../StudioShell";

export default function MobileBottomBar(props: {
  active: MobileSheetKind;
  onTools: () => void;
  onInspector: () => void;
  onMore: () => void;
}) {
  const { active } = props;

  return (
    <div
      className="absolute left-0 right-0 bottom-0 z-20 px-3 pb-3"
      style={{ paddingBottom: "calc(12px + env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto max-w-140 rounded-2xl border border-black/10 bg-white/92 shadow-lg backdrop-blur px-2 py-2 flex items-center justify-between">
        <MobileBarButton
          label="Tools"
          active={active === "tools"}
          onClick={props.onTools}
          icon={<IconWrench />}
        />
        <div className="w-px h-8 bg-black/10" />
        <MobileBarButton
          label="Inspect"
          active={active === "inspector"}
          onClick={props.onInspector}
          icon={<IconSliders />}
        />
        <div className="w-px h-8 bg-black/10" />
        <MobileBarButton
          label="More"
          active={active === "more"}
          onClick={props.onMore}
          icon={<IconDots />}
        />
      </div>
    </div>
  );
}

function MobileBarButton(props: {
  label: string;
  active?: boolean;
  onClick: () => void;
  icon: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={[
        "flex-1 min-w-0 px-3 py-2 rounded-xl flex items-center justify-center gap-2",
        props.active ? "bg-black/5 ring-1 ring-black/10" : "hover:bg-black/5",
      ].join(" ")}
      aria-label={props.label}
      title={props.label}
    >
      <span className="opacity-80">{props.icon}</span>
      <span className="text-[12px] text-black/80">{props.label}</span>
    </button>
  );
}

function IconWrench() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M12.5 3.7a4.2 4.2 0 0 0-3.7 6.2L4.5 14.2a1.5 1.5 0 0 0 2.1 2.1l4.3-4.3a4.2 4.2 0 0 0 6.2-3.7l-2.4 1-1.9-1.9 1-2.4Z"
        stroke="rgba(15,23,42,0.75)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconSliders() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M4 5h12M4 10h12M4 15h12"
        stroke="rgba(15,23,42,0.75)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M7 5v0M12 10v0M9 15v0"
        stroke="rgba(15,23,42,0.75)"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconDots() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="6" cy="10" r="1.5" fill="rgba(15,23,42,0.75)" />
      <circle cx="10" cy="10" r="1.5" fill="rgba(15,23,42,0.75)" />
      <circle cx="14" cy="10" r="1.5" fill="rgba(15,23,42,0.75)" />
    </svg>
  );
}
