// apps/studio/app/studio/apps/garden/components/GardenMobileTopNav.tsx
"use client";

import { Home } from "lucide-react";

export default function GardenMobileTopNav(props: {
  viewLabel: string;
  onGoWorkplace?: () => void;
}) {
  return (
    <div className="md:hidden w-full">
      <div className="h-14 px-4 flex items-center justify-between">
        {/* Left: label + view pill */}
        <div className="flex items-center gap-3">
          <div className="text-[11px] tracking-wider text-black/40">GARDEN</div>
          <div className="rounded-xl border border-black/10 bg-white/80 px-3 py-1 text-[12px] text-black/65 shadow-sm">
            {props.viewLabel}
          </div>
        </div>

        {/* Right: HOME (tap target large, visual chrome minimal) */}
        {props.onGoWorkplace ? (
          <button
            type="button"
            onClick={props.onGoWorkplace}
            className="
              h-11 w-11
              inline-flex items-center justify-center
              rounded-xl
              bg-transparent
              border-0
              shadow-none
              hover:bg-black/5
              active:scale-[0.98]
              transition
            "
            aria-label="Home"
            title="Home"
          >
            <Home
              size={20}          // clear + readable
              strokeWidth={2}  // strong line
              className="text-black/75"
            />
          </button>
        ) : (
          <div className="h-10 w-10" />
        )}
      </div>

      <div className="h-px bg-black/7" />
    </div>
  );
}
