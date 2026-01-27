// apps/studio/app/studio/editor-core/shell/mobile/MobileBottomBar.tsx
"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { MobileSheetKind } from "./../StudioShell";

type TabKey = Exclude<MobileSheetKind, null>;

export default function MobileBottomBar(props: {
  active: MobileSheetKind;
  onTools: () => void;
  onInspector: () => void;
  onMore: () => void;
}) {
  const tabs: Array<{ key: TabKey; label: string; onClick: () => void; icon: ReactNode }> =
    useMemo(
      () => [
        { key: "tools", label: "Tools", onClick: props.onTools, icon: <IconWrench /> },
        { key: "inspector", label: "Inspect", onClick: props.onInspector, icon: <IconSliders /> },
        { key: "more", label: "More", onClick: props.onMore, icon: <IconDots /> },
      ],
      [props.onTools, props.onInspector, props.onMore]
    );

  // If active is null, we hide indicator, but keep last position so it doesn't jump.
  const activeIndex =
    props.active && props.active !== "context"
      ? Math.max(0, tabs.findIndex((t) => t.key === props.active))
      : null;

  const [lastIndex, setLastIndex] = useState(0);
  const lastIndexRef = useRef(0);

  useEffect(() => {
    if (activeIndex == null) return;
    lastIndexRef.current = activeIndex;
    setLastIndex(activeIndex);
  }, [activeIndex]);

  const indicatorIndex = activeIndex ?? lastIndex;
  const indicatorVisible = activeIndex != null;

  return (
    <div
      className="absolute left-0 right-0 bottom-0 z-20 px-3 pb-3"
      style={{ paddingBottom: "calc(12px + env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto max-w-140 rounded-2xl border border-black/10 bg-white/92 shadow-lg backdrop-blur px-2 py-2">
        <div className="relative">
          {/* ✅ Apple-like sliding glass indicator */}
          <AnimatePresence initial={false}>
            {indicatorVisible ? (
              <motion.div
                key="indicator"
                className={[
                  "absolute inset-y-0 left-0 w-1/3 rounded-xl",
                  // iOS glass vibe
                  "bg-white/35",
                  "backdrop-blur-xl backdrop-saturate-150",
                  "ring-1 ring-black/10",
                  "shadow-[0_10px_30px_rgba(0,0,0,0.12)]",
                  // subtle gradient + top highlight like iOS
                  "bg-linear-to-b from-white/55 to-white/25",
                  "after:content-[''] after:absolute after:inset-x-2 after:top-1 after:h-px after:bg-white/70 after:rounded-full",
                ].join(" ")}
                initial={{ opacity: 0 }}
                animate={{
                  opacity: 1,
                  x: `${indicatorIndex * 100}%`,
                }}
                exit={{ opacity: 0 }}
                transition={{
                  // Apple-ish spring
                  type: "spring",
                  stiffness: 520,
                  damping: 38,
                  mass: 0.7,
                }}
                aria-hidden
              />
            ) : null}
          </AnimatePresence>

          {/* Buttons */}
          <div className="grid grid-cols-3">
            {tabs.map((t) => (
              <MobileBarButton
                key={t.key}
                label={t.label}
                active={props.active === t.key}
                onClick={t.onClick}
                icon={t.icon}
              />
            ))}
          </div>

          {/* dividers */}
          <div className="pointer-events-none absolute inset-y-2 left-1/3 w-px bg-black/10" />
          <div className="pointer-events-none absolute inset-y-2 left-2/3 w-px bg-black/10" />
        </div>
      </div>
    </div>
  );
}

function MobileBarButton(props: {
  label: string;
  active?: boolean;
  onClick: () => void;
  icon: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={[
        "relative z-10",
        "min-w-0 px-3 py-2 rounded-xl",
        "flex items-center justify-center gap-2",
        "hover:bg-black/5 transition active:scale-[0.99]",
      ].join(" ")}
      aria-label={props.label}
      title={props.label}
    >
      <span className={props.active ? "opacity-90" : "opacity-70"}>{props.icon}</span>
      <span className={props.active ? "text-[12px] text-black/85" : "text-[12px] text-black/70"}>
        {props.label}
      </span>
    </button>
  );
}

function IconWrench() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M12.5 3.7a4.2 4.2 0 0 0-3.7 6.2L4.5 14.2a1.5 1.5 0 0 0 2.1 2.1l4.3-4.3a4.2 4.2 0 0 0 6.2-3.7l-2.4 1-1.9-1.9 1-2.4Z"
        stroke="rgba(15,23,42,0.75)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconSliders() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M4 5h12M4 10h12M4 15h12"
        stroke="rgba(15,23,42,0.75)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M7 5v0M12 10v0M9 15v0"
        stroke="rgba(15,23,42,0.75)"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconDots() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="6" cy="10" r="1.5" fill="rgba(15,23,42,0.75)" />
      <circle cx="10" cy="10" r="1.5" fill="rgba(15,23,42,0.75)" />
      <circle cx="14" cy="10" r="1.5" fill="rgba(15,23,42,0.75)" />
    </svg>
  );
}
