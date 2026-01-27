"use client";

import React from "react";

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export default function AppSubBar(props: {
  children: React.ReactNode;
  compact?: boolean;
  className?: string;
}) {
  const { children, compact, className } = props;

  return (
    <div
      className={cn(
        "sticky z-10 border-b border-black/10 bg-white/60 backdrop-blur",
        compact ? "top-12" : "top-14",
        className
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between gap-3",
          compact ? "h-11 px-3" : "h-12 px-4"
        )}
      >
        {children}
      </div>
    </div>
  );
}
