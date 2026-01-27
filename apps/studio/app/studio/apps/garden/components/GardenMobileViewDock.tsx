"use client";

import React, { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LayoutDashboard } from "lucide-react";
import { NAV_ICONS } from "@/app/studio/editor-core/shell/navIcons";
import type { GardenView } from "../GardenApp";

export default function GardenMobileViewDock(props: {
  view: GardenView;
  onViewChange: (v: GardenView) => void;
}) {
  const tabs: Array<{ key: GardenView; label: string; Icon: any }> = useMemo(
    () => [
      { key: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
      { key: "designer", label: "Map", Icon: NAV_ICONS.map },
      { key: "sheets", label: "Sheets", Icon: NAV_ICONS.data },
    ],
    []
  );

  const activeIndex = Math.max(0, tabs.findIndex((t) => t.key === props.view));

  return (
    <div className="lg:hidden fixed inset-x-0 bottom-0 z-40">
      <div className="pb-[calc(env(safe-area-inset-bottom,0px)+10px)]">
        <div className="mx-auto w-fit">
          <div
            className={[
              "relative",
              "h-16 px-2 rounded-3xl",
              "border border-black/10 bg-white/85 backdrop-blur",
              "shadow-lg",
              "flex items-center gap-1",
            ].join(" ")}
          >
            {/* ✅ sliding indicator (same as original grey active background) */}
            <AnimatePresence initial={false}>
              <motion.div
                key="indicator"
                className={[
                  "absolute top-2 bottom-2 left-2", // ✅ fills “box” height
                  "w-16 rounded-2xl",
                  "bg-black/5 ring-1 ring-black/10", // ✅ original look
                ].join(" ")}
                initial={false}
                animate={{ x: `${activeIndex * 100}%`, opacity: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 520,
                  damping: 38,
                  mass: 0.7,
                }}
                aria-hidden
              />
            </AnimatePresence>

            {/* buttons (transparent, indicator provides bg) */}
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => props.onViewChange(t.key)}
                aria-label={t.label}
                title={t.label}
                className={[
                  "relative z-10",
                  "h-12 w-16 rounded-2xl",
                  "inline-flex items-center justify-center",
                  "bg-transparent",
                  "transition active:scale-[0.98]",
                ].join(" ")}
              >
                <t.Icon
                  size={22}
                  strokeWidth={1.8}
                  className={props.view === t.key ? "text-black" : "text-black/55"}
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
