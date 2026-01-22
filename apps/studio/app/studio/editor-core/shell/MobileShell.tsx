"use client";

import CanvasStage from "../canvas";
import MobileBottomBar from "./mobile/MobileBottomBar";

import ContextSheet from "./sheets/ContextSheet";
import ToolsSheet from "./sheets/ToolsSheet";
import InspectorSheet from "./sheets/InspectorSheet";
import ActionsSheet from "./sheets/ActionsSheet";

import type { MobileSheetKind } from "./StudioShell";

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

  // capabilities for actions sheet
  canCopy: boolean;
  canPaste: boolean;
  canDelete: boolean;
  canDuplicate: boolean;
  canLock: boolean;
  isLockedSelection: boolean;
  onDuplicate: () => void;
  onToggleLock: () => void;

  // left toolbar props for ToolsSheet
  showGrid: boolean;
  setShowGrid: (v: boolean) => void;
  snapToGrid: boolean;
  setSnapToGrid: (v: boolean) => void;

  canReorder: boolean;
  onBringForward: () => void;
  onSendBackward: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
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
        // toolbar props
        showGrid={props.showGrid}
        setShowGrid={props.setShowGrid}
        snapToGrid={props.snapToGrid}
        setSnapToGrid={props.setSnapToGrid}
        canReorder={props.canReorder}
        onBringForward={props.onBringForward}
        onSendBackward={props.onSendBackward}
        onBringToFront={props.onBringToFront}
        onSendToBack={props.onSendToBack}
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
