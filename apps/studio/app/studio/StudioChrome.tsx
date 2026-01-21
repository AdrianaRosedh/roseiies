"use client";

import type { PortalContext } from "../lib/portal/getPortalContext";

export default function StudioChrome({
  portal,
  sectionLabel,
  rightSlot,
  children,
  hideHeader = false,
  fullBleed = false,
  centerSlot,
}: {
  portal: PortalContext;
  sectionLabel?: string;
  rightSlot?: React.ReactNode;
  centerSlot?: React.ReactNode; // ✅ new: place tabs / “views” here (Airtable style)
  children: React.ReactNode;
  hideHeader?: boolean;
  fullBleed?: boolean;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-[#fbfbfb]">
      {!hideHeader ? (
        <header className="sticky top-0 z-50 border-b border-black/10 bg-white/70 backdrop-blur">
          <div className="h-14 px-4 flex items-center justify-between gap-3">
            {/* LEFT: brand + product + context */}
            <div className="flex min-w-0 items-center gap-3">
              <img
                src="/brand/roseiies.svg"
                alt="Roseiies"
                className="h-5 w-auto opacity-85"
                draggable={false}
              />

              <div className="flex items-baseline gap-2 min-w-0">

                {/* Section label (e.g., Garden App) */}
                {sectionLabel ? (
                  <span className="hidden sm:inline-flex rounded-full border border-black/10 bg-black/3 px-3 py-1.5 text-xs text-black/60 shadow-sm">
                    {sectionLabel}
                  </span>
                ) : null}
              </div>

              <span className="hidden md:block mx-1 h-5 w-px bg-black/10" />

              {/* Context row — compact, like Airtable */}
              <div className="hidden md:flex items-center gap-2 min-w-0">
                <ContextPill label="Workplace" value={portal.tenantName} />
                <ContextPill label="User" value={portal.userLabel} />
              </div>
            </div>

            {/* CENTER: view tabs / page-level nav (Airtable-style) */}
            <div className="hidden md:flex flex-1 justify-center min-w-0">
              <div className="min-w-0">{centerSlot}</div>
            </div>

            {/* RIGHT: actions */}
            <div className="flex items-center gap-2 shrink-0">
              {rightSlot}
              <div className="hidden lg:block text-xs text-black/45">
                Roseiies Studio
              </div>
            </div>
          </div>

          {/* Mobile: show context as a single subtle line under header */}
          <div className="md:hidden px-4 pb-2">
            <div className="text-[11px] text-black/55 truncate">
              <span className="font-medium">{portal.tenantName}</span>
              <span className="mx-2 text-black/25">•</span>
              <span>{portal.userLabel}</span>
              {sectionLabel ? (
                <>
                  <span className="mx-2 text-black/25">•</span>
                  <span>{sectionLabel}</span>
                </>
              ) : null}
            </div>
            {centerSlot ? <div className="mt-2">{centerSlot}</div> : null}
          </div>
        </header>
      ) : null}

      <main className={fullBleed ? "flex-1 p-0" : "flex-1 p-4"}>
        {children}
      </main>
    </div>
  );
}

function ContextPill({ label, value }: { label: string; value?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white/70 px-3 py-1.5 text-xs text-black/65 shadow-sm max-w-65 min-w-0">
      <span className="text-black/45">{label}:</span>
      <span className="truncate">{value ?? "—"}</span>
    </span>
  );
}
