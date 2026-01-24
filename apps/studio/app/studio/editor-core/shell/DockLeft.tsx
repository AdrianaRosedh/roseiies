// apps/studio/app/studio/editor-core/shell/DockLeft.tsx
"use client";

import React, { useMemo } from "react";

export type ShellNavItem = {
  key: string;
  label: string;
  icon?: React.ReactNode;
};

export default function DockLeft(props: {
  navItems: ShellNavItem[];
  activeKey: string;
  onChange: (key: string) => void;

  expanded: boolean;
  setExpanded: (v: boolean) => void;

  // navigation
  onGoWorkplace?: () => void;
  onOpenSettings?: () => void;

  // branding
  brandMarkSrc?: string; // collapsed only
  brandWordmarkSrc?: string; // expanded only
  brandLabel?: string; // fallback if wordmark missing

  // footer
  workspaceName?: string;
  workspaceLogoSrc?: string;
  userName?: string;
  userAvatarSrc?: string;

  bottomHint?: React.ReactNode;
}) {
  const items = useMemo(() => props.navItems ?? [], [props.navItems]);

  /**
   * Rule:
   * - Buttons/logo ALWAYS act first (never toggle dock).
   * - Clicking empty dock background toggles:
   *    collapsed -> expand
   *    expanded  -> collapse
   */
  function onDockPointerDownCapture(e: React.PointerEvent) {
    const target = e.target as HTMLElement | null;
    if (!target) return;

    // Any interactive element should NEVER toggle the dock.
    const interactive = target.closest?.(
      [
        "[data-dock-interactive='true']",
        "button",
        "a",
        "input",
        "select",
        "textarea",
        "[role='button']",
        "[role='link']",
      ].join(",")
    );

    if (interactive) return;

    // Empty-area click toggles.
    props.setExpanded(!props.expanded);
  }

  return (
    <aside
      className={[
        "h-dvh sticky top-0 z-20 flex flex-col",
        "border-r border-black/10 bg-white/70 backdrop-blur",
        "transition-[width] duration-200 ease-out",
        props.expanded ? "w-60" : "w-18",
      ].join(" ")}
      onPointerDownCapture={onDockPointerDownCapture}
    >
      {/* Header / Logo */}
      <div className="px-3 py-3 border-b border-black/10">
        <button
          type="button"
          data-dock-interactive="true"
          onClick={props.onGoWorkplace}
          className={[
            "w-full rounded-2xl hover:bg-black/5",
            "flex items-center",
            props.expanded ? "px-3 py-2" : "p-2 justify-center",
          ].join(" ")}
          title="Back to Workplace"
        >
          {!props.expanded ? (
            <div className="h-10 w-10 flex items-center justify-center overflow-hidden">
              {props.brandMarkSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={props.brandMarkSrc}
                  alt="Roseiies"
                  className="h-10 w-10 object-contain"
                  draggable={false}
                />
              ) : (
                <span className="text-sm font-semibold text-black/70">r</span>
              )}
            </div>
          ) : null}

          {props.expanded ? (
            <div className="min-w-0 flex items-center">
              {props.brandWordmarkSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={props.brandWordmarkSrc}
                  alt="Roseiies"
                  className="h-6 w-auto max-w-42.5 object-contain opacity-90"
                  draggable={false}
                />
              ) : (
                <div className="text-sm font-semibold text-black/80 truncate">
                  {props.brandLabel ?? "Roseiies"}
                </div>
              )}
            </div>
          ) : null}
        </button>
      </div>

      {/* Nav buttons */}
      <div className="p-2 space-y-1 flex-1">
        {items.map((it) => {
          const active = props.activeKey === it.key;

          return (
            <button
              key={it.key}
              type="button"
              data-dock-interactive="true"
              onClick={() => {
                // ✅ navigation only — NEVER auto expand/collapse
                props.onChange(it.key);
              }}
              className={[
                "w-full flex items-center gap-3 rounded-2xl px-3 py-2",
                "transition border",
                active
                  ? "bg-black/5 border-black/10"
                  : "bg-transparent border-transparent hover:bg-black/5 hover:border-black/10",
              ].join(" ")}
              title={it.label}
            >
              <div className="text-[18px] leading-none w-6 flex justify-center">
                {it.icon ?? "•"}
              </div>

              {props.expanded ? (
                <div className="text-sm font-semibold text-black/75 truncate">
                  {it.label}
                </div>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-black/10 space-y-2">
        {props.expanded && props.bottomHint ? (
          <div className="px-2 text-[11px] text-black/45 leading-snug">
            {props.bottomHint}
          </div>
        ) : null}

        <div className="space-y-1">
          {/* Workplace */}
          <button
            type="button"
            data-dock-interactive="true"
            onClick={props.onGoWorkplace}
            className={[
              "w-full flex items-center gap-3 rounded-2xl px-3 py-2",
              "hover:bg-black/5 border border-transparent hover:border-black/10",
            ].join(" ")}
            title="Back to Workplace"
          >
            <div className="h-9 w-9 rounded-2xl bg-black/5 flex items-center justify-center overflow-hidden">
              {props.workspaceLogoSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={props.workspaceLogoSrc}
                  alt={props.workspaceName ?? "Workplace"}
                  className="h-6 w-6 object-contain"
                  draggable={false}
                />
              ) : (
                <span className="text-[16px] text-black/60">⌂</span>
              )}
            </div>

            {props.expanded ? (
              <div className="min-w-0 text-left">
                <div className="text-xs font-semibold text-black/75 truncate">
                  {props.workspaceName ?? "Workplace"}
                </div>
                <div className="text-[11px] text-black/45 truncate">
                  Back to workspace
                </div>
              </div>
            ) : null}
          </button>

          {/* Settings / User */}
          <button
            type="button"
            data-dock-interactive="true"
            onClick={props.onOpenSettings}
            className={[
              "w-full flex items-center gap-3 rounded-2xl px-3 py-2",
              "hover:bg-black/5 border border-transparent hover:border-black/10",
            ].join(" ")}
            title="Settings"
          >
            <div className="h-9 w-9 rounded-2xl bg-black/5 flex items-center justify-center overflow-hidden">
              {props.userAvatarSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={props.userAvatarSrc}
                  alt={props.userName ?? "User"}
                  className="h-9 w-9 object-cover"
                  draggable={false}
                />
              ) : (
                <span className="text-[16px] text-black/60">⚙︎</span>
              )}
            </div>

            {props.expanded ? (
              <div className="min-w-0 text-left">
                <div className="text-xs font-semibold text-black/75 truncate">
                  {props.userName ?? "Settings"}
                </div>
                <div className="text-[11px] text-black/45 truncate">
                  Preferences & access
                </div>
              </div>
            ) : null}
          </button>
        </div>
      </div>
    </aside>
  );
}