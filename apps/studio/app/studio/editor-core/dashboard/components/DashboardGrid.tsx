// apps/studio/app/studio/editor-core/dashboard/components/DashboardGrid.tsx
"use client";

import React from "react";

export default function DashboardGrid(props: {
  children: React.ReactNode;
  cols?: 1 | 2 | 3;
}) {
  const cols = props.cols ?? 2;

  const cls =
    cols === 1
      ? "grid grid-cols-1 gap-3"
      : cols === 3
        ? "grid grid-cols-1 lg:grid-cols-3 gap-3"
        : "grid grid-cols-1 lg:grid-cols-2 gap-3";

  return <div className={cls}>{props.children}</div>;
}
