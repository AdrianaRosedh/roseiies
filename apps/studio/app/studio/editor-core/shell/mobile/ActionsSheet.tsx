"use client";

import MobileSheet from "../../MobileSheet";

export default function ActionsSheet(props: {
  open: boolean;
  onClose: () => void;

  store: any;
  portal: any;

  canCopy: boolean;
  canPaste: boolean;
  canDelete: boolean;
  canDuplicate: boolean;
  canLock: boolean;
  isLockedSelection: boolean;

  onDuplicate: () => void;
  onToggleLock: () => void;
}) {
  return (
    <MobileSheet open={props.open} title="Actions" onClose={props.onClose}>
      <div className="p-3 space-y-2">
        <ActionRow
          label="Reset view"
          onClick={() => {
            props.store?.resetView?.();
            props.onClose();
          }}
        />

        <ActionRow
          label="Copy"
          disabled={!props.canCopy}
          onClick={() => {
            props.store?.copySelected?.();
            props.onClose();
          }}
        />

        <ActionRow
          label="Paste"
          disabled={!props.canPaste}
          onClick={() => {
            props.store?.pasteAtCursor?.();
            props.onClose();
          }}
        />

        <ActionRow
          label="Duplicate"
          disabled={!props.canDuplicate}
          onClick={() => {
            props.onDuplicate();
            props.onClose();
          }}
        />

        <ActionRow
          label={props.isLockedSelection ? "Unlock" : "Lock"}
          disabled={!props.canLock}
          onClick={() => {
            props.onToggleLock();
          }}
        />

        <ActionRow
          label="Delete"
          danger
          disabled={!props.canDelete}
          onClick={() => {
            props.store?.deleteSelected?.();
            props.onClose();
          }}
        />

        <div className="h-px bg-black/10 my-2" />

        <ActionRow
          label="Publish"
          onClick={() => {
            props.store?.publishLayout?.(props.portal?.tenantId);
            props.onClose();
          }}
        />
      </div>
    </MobileSheet>
  );
}

function ActionRow(props: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={props.disabled}
      onClick={props.onClick}
      className={[
        "w-full text-left px-4 py-3 rounded-xl border border-black/10 bg-white/80",
        props.disabled ? "opacity-40 cursor-not-allowed" : "hover:bg-white",
        props.danger ? "text-red-700" : "text-black/85",
      ].join(" ")}
    >
      {props.label}
    </button>
  );
}