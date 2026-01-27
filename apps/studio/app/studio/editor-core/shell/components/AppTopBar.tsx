"use client";

import React from "react";

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export default function AppTopBar(props: {
  appLabel: string;
  sectionLabel: string | null;

  /** pill label like "Map" / "Sheets" */
  viewLabel?: string | null;

  statusLine?: React.ReactNode;
  center?: React.ReactNode;
  actions?: React.ReactNode;

  className?: string;
}) {
  const {
    appLabel,
    sectionLabel,
    viewLabel,
    statusLine,
    center,
    actions,
    className,
  } = props;

  return (
    <div
      className={cn(
        "sticky top-0 z-20 bg-white/70 backdrop-blur",
        className
      )}
    >
      <div className="flex items-center justify-between gap-3 px-3 h-12 lg:h-14 lg:px-4">
        {/* LEFT */}
        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="text-[11px] uppercase tracking-wide text-black/45">
              {appLabel}
            </div>

            {viewLabel ? (
              <span className="rounded-md border border-black/10 bg-white/70 px-2 py-1 text-[11px] text-black/60">
                {viewLabel}
              </span>
            ) : null}
          </div>

          {/* ✅ Hide the big secondary title on mobile (shows on desktop) */}
          {sectionLabel ? (
            <div className="hidden lg:block text-sm font-semibold text-black/80 truncate">
              {sectionLabel}
            </div>
          ) : null}

          {statusLine ? (
            <div className="hidden lg:block mt-1 text-xs text-black/60 truncate">
              {statusLine}
            </div>
          ) : null}
        </div>

        {/* CENTER */}
        {center ? (
          <div className="hidden lg:flex flex-1 min-w-0 items-center justify-center">
            {center}
          </div>
        ) : (
          <div className="flex-1" />
        )}

        {/* RIGHT */}
        <div className="flex items-center gap-2 shrink-0">{actions}</div>
      </div>
    </div>
  );
}
