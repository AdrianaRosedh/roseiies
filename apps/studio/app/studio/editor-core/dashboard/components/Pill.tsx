// apps/studio/app/studio/editor-core/dashboard/components/Pill.tsx
"use client";

import React from "react";

export default function Pill(props: { label: string; value?: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/75 px-3 py-1 text-xs text-black/70">
      <span className="capitalize">{props.label}</span>
      {props.value != null ? (
        <>
          <span className="text-black/35">·</span>
          <span className="font-medium text-black/70">{props.value}</span>
        </>
      ) : null}
    </span>
  );
}
