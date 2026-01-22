"use client";

import type { StudioModule, ItemType } from "./types";

export default function LeftToolbar(props: {
  module: StudioModule;
  tool: ItemType;
  setTool: (t: ItemType) => void;

  // ✅ Quick actions
  canDuplicate: boolean;
  canLock: boolean;
  canDelete: boolean;
  isLockedSelection: boolean;
  onDuplicate: () => void;
  onToggleLock: () => void;
  onDelete: () => void;

  // ✅ Snap / Grid
  showGrid: boolean;
  setShowGrid: (v: boolean) => void;
  snapToGrid: boolean;
  setSnapToGrid: (v: boolean) => void;

  // ✅ Layers / Order
  canReorder: boolean;
  onBringForward: () => void;
  onSendBackward: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
}) {
  return (
    <aside className="border-r border-black/10 bg-white/60 p-4">
      <div className="text-xs text-black/55">
        Double-click to drop · Scroll to zoom · Hold space to pan · Cmd/Ctrl+C/V/D
      </div>

      {/* ✅ Quick Actions */}
      <Panel title="Quick actions">
        <div className="grid grid-cols-3 gap-2">
          <SmallButton disabled={!props.canDuplicate} onClick={props.onDuplicate}>
            Duplicate
          </SmallButton>

          <SmallButton disabled={!props.canLock} onClick={props.onToggleLock}>
            {props.isLockedSelection ? "Unlock" : "Lock"}
          </SmallButton>

          <SmallButton danger disabled={!props.canDelete} onClick={props.onDelete}>
            Delete
          </SmallButton>
        </div>
      </Panel>

      {/* ✅ Snap / Grid */}
      <Panel title="Snap / Grid">
        <ToggleRow
          label="Show grid"
          value={props.showGrid}
          onChange={props.setShowGrid}
        />
        <ToggleRow
          label="Snap to grid"
          value={props.snapToGrid}
          onChange={props.setSnapToGrid}
        />
        <div className="mt-2 text-[11px] text-black/45 leading-snug">
          Snap applies when you move/resize items (it rounds x/y/w/h).
        </div>
      </Panel>

      {/* ✅ Layers / Order */}
      <Panel title="Layers / Order">
        <div className="grid grid-cols-2 gap-2">
          <SmallButton disabled={!props.canReorder} onClick={props.onBringForward}>
            Bring forward
          </SmallButton>
          <SmallButton disabled={!props.canReorder} onClick={props.onSendBackward}>
            Send backward
          </SmallButton>
          <SmallButton disabled={!props.canReorder} onClick={props.onBringToFront}>
            To front
          </SmallButton>
          <SmallButton disabled={!props.canReorder} onClick={props.onSendToBack}>
            To back
          </SmallButton>
        </div>
      </Panel>

      {/* ✅ Tools */}
      <Panel title="Tools">
        <div className="space-y-2">
          {props.module.tools.map((t) => (
            <ToolButton
              key={t.id}
              label={t.label}
              active={props.tool === t.id}
              onClick={() => props.setTool(t.id)}
            />
          ))}
        </div>
      </Panel>

      <div className="mt-6 rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
        <div className="text-xs text-black/60">Tip</div>
        <div className="mt-2 text-xs text-black/55">
          Cursor paste: copy, move mouse, paste — it lands under your cursor.
        </div>
      </div>
    </aside>
  );
}

function Panel(props: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5 rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold text-black/70">{props.title}</div>
      <div className="mt-3">{props.children}</div>
    </div>
  );
}

function ToolButton(props: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={`w-full rounded-2xl border px-4 py-3 text-left text-sm transition shadow-sm ${
        props.active ? "border-black/15 bg-black/5" : "border-black/10 bg-white hover:bg-black/5"
      }`}
    >
      {props.label}
    </button>
  );
}

function SmallButton(props: {
  children: React.ReactNode;
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
        "rounded-xl border px-3 py-2 text-[12px] shadow-sm transition",
        props.disabled ? "opacity-40 cursor-not-allowed" : "hover:bg-black/5",
        props.danger ? "text-red-700 border-red-200 hover:bg-red-500/10" : "border-black/10 bg-white",
      ].join(" ")}
    >
      {props.children}
    </button>
  );
}

function ToggleRow(props: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 py-2">
      <span className="text-[12px] text-black/75">{props.label}</span>
      <input
        type="checkbox"
        checked={props.value}
        onChange={(e) => props.onChange(e.target.checked)}
        className="h-4 w-4"
      />
    </label>
  );
}