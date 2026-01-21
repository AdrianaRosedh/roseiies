"use client";

import * as React from "react";

function IconGrid() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M4 4h5v5H4V4Zm7 0h5v5h-5V4ZM4 11h5v5H4v-5Zm7 0h5v5h-5v-5Z" fill="currentColor" opacity="0.9" />
    </svg>
  );
}
function IconSliders() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M5 5h10M7 10h8M5 15h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M8 5v0M12 10v0M7 15v0" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}
function IconMore() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="6" cy="10" r="1.6" fill="currentColor" />
      <circle cx="10" cy="10" r="1.6" fill="currentColor" />
      <circle cx="14" cy="10" r="1.6" fill="currentColor" />
    </svg>
  );
}

function BarButton(props: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={[
        "flex flex-col items-center justify-center gap-1",
        "h-12 w-20 rounded-2xl",
        props.active ? "bg-black/6 text-black" : "text-black/70 hover:bg-black/5",
      ].join(" ")}
    >
      {props.icon}
      <span className="text-[11px] font-medium">{props.label}</span>
    </button>
  );
}

export default function MobileBottomBar(props: {
  active: "tools" | "inspector" | "more" | null;
  onTools: () => void;
  onInspector: () => void;
  onMore: () => void;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-70 px-3 pb-[max(env(safe-area-inset-bottom),10px)] pt-2">
      <div className="mx-auto flex max-w-130 items-center justify-between rounded-3xl border border-black/10 bg-white/85 px-3 py-2 shadow-xl backdrop-blur">
        <BarButton
          label="Tools"
          icon={<IconGrid />}
          onClick={props.onTools}
          active={props.active === "tools"}
        />
        <BarButton
          label="Inspect"
          icon={<IconSliders />}
          onClick={props.onInspector}
          active={props.active === "inspector"}
        />
        <BarButton
          label="More"
          icon={<IconMore />}
          onClick={props.onMore}
          active={props.active === "more"}
        />
      </div>
    </div>
  );
}