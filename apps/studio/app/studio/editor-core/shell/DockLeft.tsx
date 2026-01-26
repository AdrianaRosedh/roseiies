"use client";

import React, { useMemo } from "react";
import { Home, Settings, ChevronRight } from "lucide-react";

export type ShellNavItem = {
  key: string;
  label: string;
  icon?: React.ReactNode | React.ComponentType<any>;
};

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function renderIcon(icon: any, args: { active: boolean }) {
  const { active } = args;

  const common = {
    size: 22,
    strokeWidth: 1.6,
    className: cn(
      "transition-colors",
      active ? "text-rose-600" : "text-black/45 group-hover:text-black/70"
    ),
  };

  // ✅ Lucide icons are often forwardRef objects ({ $$typeof, render })
  // They must be rendered as a component type, NOT as a React child.
  if (icon && (typeof icon === "function" || typeof icon === "object")) {
    // If it's already an element (<Icon />)
    if (React.isValidElement(icon)) {
      return React.cloneElement(icon as any, {
        ...common,
        ...((icon as any).props ?? {}),
        className: cn(common.className, (icon as any).props?.className),
      });
    }

    // Otherwise treat it as a component type (works for forwardRef objects)
    const Icon = icon as React.ComponentType<any>;
    return <Icon {...common} />;
  }

  // fallback
  return (
    <div
      className={cn(
        "h-5.5 w-5.5 rounded-md grid place-items-center text-[12px]",
        active ? "text-rose-600" : "text-black/45"
      )}
    >
      •
    </div>
  );
}

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

    props.setExpanded(!props.expanded);
  }

  return (
    <aside
      className={cn(
        "h-dvh sticky top-0 z-20 flex flex-col",
        "border-r border-black/10 bg-white/70 backdrop-blur",
        "transition-[width] duration-200 ease-out",
        props.expanded ? "w-60" : "w-18"
      )}
      onPointerDownCapture={onDockPointerDownCapture}
    >
      {/* Header / Logo */}
      <div className="px-3 py-3 border-b border-black/10">
        <button
          type="button"
          data-dock-interactive="true"
          onClick={props.onGoWorkplace}
          className={cn(
            "w-full rounded-2xl transition hover:bg-black/5",
            "flex items-center",
            props.expanded ? "px-3 py-2" : "p-2 justify-center"
          )}
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
            <div className="min-w-0 flex items-center gap-2">
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

              {/* subtle affordance */}
              <ChevronRight className="ml-auto text-black/30" size={18} strokeWidth={1.5} />
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
              onClick={() => props.onChange(it.key)}
              className={cn(
                "group w-full flex items-center gap-3 px-3 py-2",
                "relative transition-colors",
                active
                  ? "text-black"
                  : "text-black/60 hover:text-black/80"
              )}              
              title={it.label}
            >
              {/* active accent bar */}
              <div
                className={cn(
                  "absolute left-2 top-1/2 -translate-y-1/2 h-5 w-px rounded-full transition-opacity",
                  active ? "opacity-100 bg-rose-600" : "opacity-0"
                )}
              />

              <div className="w-6 h-6 flex items-center justify-center">
                {renderIcon(it.icon, { active })}
              </div>           

              {props.expanded ? (
                <div
                  className={cn(
                    "text-sm font-semibold truncate transition-colors",
                    active ? "text-black/80" : "text-black/70 group-hover:text-black/80"
                  )}
                >
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
            className={cn(
              "w-full flex items-center gap-3 rounded-2xl px-3 py-2",
              "hover:bg-black/5 border border-transparent hover:border-black/10 transition"
            )}
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
                <Home size={18} strokeWidth={1.6} className="text-black/55" />
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
            className={cn(
              "w-full flex items-center gap-3 rounded-2xl px-3 py-2",
              "hover:bg-black/5 border border-transparent hover:border-black/10 transition"
            )}
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
                <Settings size={18} strokeWidth={1.6} className="text-black/55" />
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
