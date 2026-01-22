"use client";

import MobileSheet from "../../MobileSheet";
import LeftToolbar from "../../LeftToolbar";
import type { StudioModule } from "../../types";

export default function ToolsSheet(props: {
  open: boolean;
  onClose: () => void;

  module: StudioModule;
  store: any;

  // toolbar toggles
  showGrid: boolean;
  setShowGrid: (v: boolean) => void;
  snapToGrid: boolean;
  setSnapToGrid: (v: boolean) => void;

  // layers
  canReorder: boolean;
  onBringForward: () => void;
  onSendBackward: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
}) {
  const selectedItems = props.store?.selectedItems ?? [];
  const anyLocked = selectedItems.some((it: any) => Boolean(it?.meta?.locked));

  const canDuplicate = (props.store?.selectedIds?.length ?? 0) > 0;
  const canLock = (props.store?.selectedIds?.length ?? 0) > 0;
  const canDelete = (props.store?.selectedIds?.length ?? 0) > 0;

  function onDuplicate() {
    props.store?.copySelected?.();
    props.store?.pasteAtCursor?.();
  }

  function onToggleLock() {
    if (!selectedItems.length) return;
    const nextLocked = !anyLocked;
    selectedItems.forEach((it: any) => {
      props.store?.updateItem?.(it.id, { meta: { ...it.meta, locked: nextLocked } });
    });
  }

  function onDelete() {
    props.store?.deleteSelected?.();
  }

  return (
    <MobileSheet open={props.open} title="Tools" onClose={props.onClose}>
      <div className="p-3">
        <LeftToolbar
          module={props.module}
          tool={props.store.tool}
          setTool={(t: any) => {
            props.store.setTool(t);
            props.store.quickInsert?.(t);
            props.onClose();
          }}

          // Quick actions
          canDuplicate={canDuplicate}
          canLock={canLock}
          canDelete={canDelete}
          isLockedSelection={anyLocked}
          onDuplicate={() => {
            onDuplicate();
            props.onClose();
          }}
          onToggleLock={onToggleLock}
          onDelete={() => {
            onDelete();
            props.onClose();
          }}

          // Snap / Grid
          showGrid={props.showGrid}
          setShowGrid={props.setShowGrid}
          snapToGrid={props.snapToGrid}
          setSnapToGrid={props.setSnapToGrid}

          // Layers
          canReorder={props.canReorder}
          onBringForward={props.onBringForward}
          onSendBackward={props.onSendBackward}
          onBringToFront={props.onBringToFront}
          onSendToBack={props.onSendToBack}
        />
      </div>
    </MobileSheet>
  );
}