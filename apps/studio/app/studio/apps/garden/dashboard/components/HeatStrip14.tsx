// apps/studio/app/studio/apps/garden/dashboard/components/HeatStrip14.tsx
"use client";

import React, { useMemo } from "react";

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

export default function HeatStrip14(props: {
  values: number[]; // last ~14 values
  title?: string;
  className?: string;
}) {
  const vals = (props.values ?? []).slice(-14).map((v) => (Number.isFinite(v) ? v : 0));
  const max = Math.max(0, ...vals);

  const cells = useMemo(() => {
    return vals.map((v) => {
      if (max <= 0) return "bg-black/5 border-black/10";
      const t = clamp(v / max, 0, 1);
      if (t <= 0.01) return "bg-black/5 border-black/10";
      if (t <= 0.33) return "bg-black/10 border-black/10";
      if (t <= 0.66) return "bg-black/20 border-black/10";
      return "bg-black/30 border-black/10";
    });
  }, [vals, max]);

  return (
    <div title={props.title} className={props.className}>
      <div className="flex items-center gap-1">
        {cells.map((cls, i) => (
          <span
            key={i}
            className={`h-3 w-3 rounded-sm border ${cls}`}
            aria-label={`day-${i}:${vals[i] ?? 0}`}
          />
        ))}
      </div>
    </div>
  );
}
