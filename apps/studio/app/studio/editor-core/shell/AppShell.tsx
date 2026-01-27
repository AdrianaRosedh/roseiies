"use client";

import React, { useEffect, useRef } from "react";
import DockLeft, { type ShellNavItem } from "./DockLeft";
import PoweredBy from "./PoweredBy";

export type { ShellNavItem };

export default function AppShell(props: {
  navItems: ShellNavItem[];
  activeKey: string;
  onChange: (key: string) => void;
  children: React.ReactNode;

  onGoWorkplace?: () => void;
  onOpenSettings?: () => void;

  brandMarkSrc?: string;
  brandWordmarkSrc?: string;
  brandLabel?: string;

  workspaceName?: string;
  workspaceLogoSrc?: string;
  userName?: string;
  userAvatarSrc?: string;

  dockDefaultExpanded?: boolean;
  bottomHint?: React.ReactNode;
  watermarkText?: string;
}) {
  const [expanded, setExpanded] = React.useState(Boolean(props.dockDefaultExpanded));
  const dockRef = useRef<HTMLDivElement | null>(null);

  // ✅ Click outside closes the dock (only when expanded)
  useEffect(() => {
    if (!expanded) return;

    function onDown(e: MouseEvent) {
      const target = e.target as Node | null;
      if (!target) return;
      if (dockRef.current?.contains(target)) return;
      setExpanded(false);
    }

    document.addEventListener("mousedown", onDown, true);
    return () => document.removeEventListener("mousedown", onDown, true);
  }, [expanded]);

  return (
    <div className="w-full h-dvh overflow-hidden flex bg-[#fbfbfb]">
      {/* Desktop dock only (DockLeft already self-hides on mobile now) */}
      <div className="hidden lg:block" ref={dockRef}>
        <DockLeft
          navItems={props.navItems}
          activeKey={props.activeKey}
          onChange={props.onChange}
          expanded={expanded}
          setExpanded={setExpanded}
          onGoWorkplace={props.onGoWorkplace}
          onOpenSettings={props.onOpenSettings}
          brandMarkSrc={props.brandMarkSrc}
          brandWordmarkSrc={props.brandWordmarkSrc}
          brandLabel={props.brandLabel}
          workspaceName={props.workspaceName}
          workspaceLogoSrc={props.workspaceLogoSrc}
          userName={props.userName}
          userAvatarSrc={props.userAvatarSrc}
          bottomHint={props.bottomHint}
        />
      </div>

      <main className="flex-1 min-w-0 h-full overflow-hidden relative">
        {props.children}
        <PoweredBy text={props.watermarkText ?? "Powered by Roseiies"} />
      </main>
    </div>
  );
}
