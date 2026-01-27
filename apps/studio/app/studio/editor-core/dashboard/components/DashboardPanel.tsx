// apps/studio/app/studio/editor-core/dashboard/components/DashboardPanel.tsx
"use client";

import React from "react";

export default function DashboardPanel(props: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={[
        "rounded-2xl border border-black/10 bg-white/60 shadow-sm backdrop-blur",
        "overflow-hidden",
        props.className ?? "",
      ].join(" ")}
    >
      <div className="px-4 py-3 border-b border-black/10 flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-black/70 truncate">{props.title}</div>
        {props.right ? <div className="shrink-0">{props.right}</div> : null}
      </div>
      <div className="p-4">{props.children}</div>
    </div>
  );
}
