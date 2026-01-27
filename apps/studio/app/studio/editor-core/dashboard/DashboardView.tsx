// apps/studio/app/studio/editor-core/dashboard/DashboardView.tsx
"use client";

import React from "react";

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export default function DashboardView(props: {
  // optional header (use when you don't have an app header)
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  subheader?: React.ReactNode;

  children: React.ReactNode;

  className?: string;
}) {
  const hasHeader = Boolean(props.title || props.subtitle || props.actions || props.subheader);

  return (
    <div className={cn("h-full w-full overflow-hidden", props.className)}>
      {/* Match Map/Shell spacing: mt-3 + px-3 pb-3 */}
      <div className="mt-3 h-full overflow-hidden px-3 pb-3">
        <div className="h-full overflow-hidden rounded-2xl border border-black/10 bg-white/40 shadow-sm flex flex-col">
          {hasHeader ? (
            <div className="border-b border-black/10 bg-white/60 backdrop-blur">
              <div className="px-4 md:px-5 py-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  {props.title ? (
                    <div className="text-[16px] md:text-[18px] font-semibold text-black/75 truncate">
                      {props.title}
                    </div>
                  ) : null}
                  {props.subtitle ? (
                    <div className="mt-1 text-sm text-black/45">{props.subtitle}</div>
                  ) : null}
                </div>

                {props.actions ? (
                  <div className="shrink-0 flex items-center gap-2">{props.actions}</div>
                ) : null}
              </div>

              {props.subheader ? <div className="px-4 md:px-5 pb-4">{props.subheader}</div> : null}
            </div>
          ) : null}

          <div className="flex-1 min-h-0 overflow-auto">
            <div className="p-3 md:p-4">{props.children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
