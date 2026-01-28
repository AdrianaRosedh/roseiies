// apps/studio/app/studio/apps/garden/dashboard/components/Sparkline.tsx
"use client";

import React, { useMemo } from "react";

export default function Sparkline(props: {
  values: number[];
  width?: number;
  height?: number;
  strokeWidth?: number;
  className?: string;
  title?: string;
  fill?: boolean;
}) {
  const width = props.width ?? 110;
  const height = props.height ?? 28;
  const strokeWidth = props.strokeWidth ?? 2;

  const values = (props.values ?? []).map((v) => (Number.isFinite(v) ? v : 0));
  const n = values.length;

  const { pathD, areaD, hasData } = useMemo(() => {
    if (n < 2) return { pathD: "", areaD: "", hasData: false };

    const min = Math.min(...values);
    const max = Math.max(...values);
    const hasData = max !== min || max !== 0;

    const pad = strokeWidth;
    const innerW = width - pad * 2;
    const innerH = height - pad * 2;

    const xAt = (i: number) => pad + (innerW * i) / (n - 1);
    const yAt = (v: number) => {
      if (max === min) return pad + innerH / 2;
      const t = (v - min) / (max - min);
      return pad + innerH * (1 - t);
    };

    let d = "";
    for (let i = 0; i < n; i++) {
      const x = xAt(i);
      const y = yAt(values[i]);
      d += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
    }

    const area =
      `M ${xAt(0)} ${height - pad} ` +
      values.map((v, i) => `L ${xAt(i)} ${yAt(v)}`).join(" ") +
      ` L ${xAt(n - 1)} ${height - pad} Z`;

    return { pathD: d, areaD: area, hasData };
  }, [values, n, width, height, strokeWidth]);

  if (!hasData) {
    return (
      <div title={props.title} className={props.className}>
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          <path
            d={`M 6 ${height / 2} L ${width - 6} ${height / 2}`}
            className="stroke-black/15"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </div>
    );
  }

  return (
    <div title={props.title} className={props.className}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {props.fill ? <path d={areaD} className="fill-black/5" stroke="none" /> : null}
        <path
          d={pathD}
          className="stroke-black/35"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    </div>
  );
}
