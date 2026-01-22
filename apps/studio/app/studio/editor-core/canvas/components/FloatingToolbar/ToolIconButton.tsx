// apps/studio/app/studio/editor-core/canvas/components/FloatingToolbar/ToolIconButton.tsx
"use client";

import React from "react";

export default function ToolIconButton(props: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      title={props.title}
      onClick={props.onClick}
      disabled={props.disabled}
      className={[
        "h-8 w-8 inline-flex items-center justify-center rounded-full transition",
        props.disabled ? "opacity-35 cursor-not-allowed" : "",
        props.active ? "bg-black/5 ring-1 ring-black/10" : "",
        props.danger
          ? "hover:bg-red-500/10 text-red-700"
          : "hover:bg-black/5 text-black/80",
      ].join(" ")}
    >
      {props.children}
    </button>
  );
}
