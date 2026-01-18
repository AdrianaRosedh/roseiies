"use client";

import type { PortalContext } from "../lib/portal/getPortalContext";

export default function StudioChrome({
  portal,
  sectionLabel,
  rightSlot,
  children,
}: {
  portal: PortalContext;
  sectionLabel?: string;
  rightSlot?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Tool header */}
      <header className="sticky top-0 z-50 border-b border-black/10 bg-white/55 backdrop-blur">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex min-w-0 items-center gap-3">
            <img
              src="/brand/roseiies.svg"
              alt="Roseiies"
              className="h-5 w-auto opacity-85"
              draggable={false}
            />
            <span className="text-sm font-semibold tracking-tight">Studio</span>

            <span className="mx-2 h-5 w-px bg-black/10" />

            <span className="rounded-full border border-black/10 bg-white/70 px-3 py-1.5 text-xs text-black/70 shadow-sm max-w-65 truncate">
              Workplace: {portal.tenantName}
            </span>

            <span className="rounded-full border border-black/10 bg-white/70 px-3 py-1.5 text-xs text-black/70 shadow-sm max-w-65 truncate">
              User: {portal.userLabel}
            </span>

            {sectionLabel ? (
              <span className="rounded-full border border-black/10 bg-white/60 px-3 py-1.5 text-xs text-black/55 shadow-sm">
                {sectionLabel}
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            {rightSlot}
            <div className="text-xs text-black/45 hidden md:block">Roseiies Platform</div>
          </div>
        </div>
      </header>

      {/* Full-width content */}
      <main className="flex-1 p-4">{children}</main>
    </div>
  );
}
