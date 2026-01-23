// apps/studio/app/studio/editor-core/shell/MobileShell.tsx
"use client";

import type { ComponentType } from "react";

import CanvasStage from "../canvas";
import MobileBottomBar from "./mobile/MobileBottomBar";

import _ContextSheet from "./sheets/ContextSheet";
import _ToolsSheet from "./sheets/ToolsSheet";
import _InspectorSheet from "./sheets/InspectorSheet";
import _ActionsSheet from "./sheets/ActionsSheet";

import type { MobileSheetKind } from "./StudioShell";

// ✅ TS fix: sheets may be typed as {} in their files; widen at boundary.
const ContextSheet = _ContextSheet as unknown as ComponentType<any>;
const ToolsSheet = _ToolsSheet as unknown as ComponentType<any>;
const InspectorSheet = _InspectorSheet as unknown as ComponentType<any>;
const ActionsSheet = _ActionsSheet as unknown as ComponentType<any>;

export default function MobileShell(props: {
  module: any;
  store: any;
  portal: any;

  mobileSheet: MobileSheetKind;
  setMobileSheet: (v: MobileSheetKind) => void;
  toggleSheet: (k: Exclude<MobileSheetKind, null>) => void;

  canvasProps: any;

  activeGarden: any;
  layoutsForGarden: any[];
  activeLayout: any;

  canCopy: boolean;
  canPaste: boolean;
  canDelete: boolean;
  canDuplicate: boolean;
  canLock: boolean;
  isLockedSelection: boolean;
  onDuplicate: () => void;
  onToggleLock: () => void;

  showGrid: boolean;
  setShowGrid: (v: boolean) => void;
  snapToGrid: boolean;
  setSnapToGrid: (v: boolean) => void;

  canReorder: boolean;
  onBringForward: () => void;
  onSendBackward: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;

  // ✅ Optional: if you later add align/distribute to mobile ToolsSheet
  canArrange?: boolean;
  canDistribute?: boolean;
  alignTo?: "selection" | "plot";
  setAlignTo?: (v: "selection" | "plot") => void;
  onAlign?: (k: "left" | "center" | "right" | "top" | "middle" | "bottom") => void;
  onDistribute?: (axis: "x" | "y") => void;
}) {
  return (
    <div className="md:hidden mt-3 rounded-2xl border border-black/10 bg-white/40 shadow-sm overflow-hidden relative h-[calc(100vh-56px-56px-28px)]">
      <CanvasStage {...props.canvasProps} />

      <MobileBottomBar
        active={props.mobileSheet}
        onTools={() => props.toggleSheet("tools")}
        onInspector={() => props.toggleSheet("inspector")}
        onMore={() => props.toggleSheet("more")}
      />

      <ContextSheet
        open={props.mobileSheet === "context"}
        onClose={() => props.setMobileSheet(null)}
        store={props.store}
        portal={props.portal}
        activeGarden={props.activeGarden}
        layoutsForGarden={props.layoutsForGarden}
        activeLayout={props.activeLayout}
      />

      <ToolsSheet
        open={props.mobileSheet === "tools"}
        onClose={() => props.setMobileSheet(null)}
        module={props.module}
        store={props.store}
        showGrid={props.showGrid}
        setShowGrid={props.setShowGrid}
        snapToGrid={props.snapToGrid}
        setSnapToGrid={props.setSnapToGrid}
        canReorder={props.canReorder}
        onBringForward={props.onBringForward}
        onSendBackward={props.onSendBackward}
        onBringToFront={props.onBringToFront}
        onSendToBack={props.onSendToBack}
        // ✅ Optional pass-through (ToolsSheet can ignore if not implemented)
        canArrange={props.canArrange}
        canDistribute={props.canDistribute}
        alignTo={props.alignTo}
        setAlignTo={props.setAlignTo}
        onAlign={props.onAlign}
        onDistribute={props.onDistribute}
      />

      <InspectorSheet
        open={props.mobileSheet === "inspector"}
        onClose={() => props.setMobileSheet(null)}
        module={props.module}
        store={props.store}
      />

      <ActionsSheet
        open={props.mobileSheet === "more"}
        onClose={() => props.setMobileSheet(null)}
        store={props.store}
        portal={props.portal}
        canCopy={props.canCopy}
        canPaste={props.canPaste}
        canDelete={props.canDelete}
        canDuplicate={props.canDuplicate}
        canLock={props.canLock}
        isLockedSelection={props.isLockedSelection}
        onDuplicate={props.onDuplicate}
        onToggleLock={props.onToggleLock}
      />
    </div>
  );
}