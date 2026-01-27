// apps/studio/app/studio/editor-core/dashboard/components/KpiStat.tsx
"use client";

import React from "react";

export default function KpiStat(props: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white/70 px-3 py-2">
      <div className="text-[11px] text-black/40">{props.label}</div>
      <div className="text-sm font-medium text-black/75 truncate">{props.value}</div>
      {props.hint ? <div className="mt-1 text-[11px] text-black/35">{props.hint}</div> : null}
    </div>
  );
}
