"use client";

import { useMemo, useState } from "react";
import type { StudioModule, ItemType } from "./types";

type SectionKey = "quick" | "snap" | "layers" | "tools" | "tip";

export default function LeftToolbar(props: {
  module: StudioModule;
  tool: ItemType;
  setTool: (t: ItemType) => void;

  // Quick actions
  canDuplicate: boolean;
  canLock: boolean;
  canDelete: boolean;
  isLockedSelection: boolean;
  onDuplicate: () => void;
  onToggleLock: () => void;
  onDelete: () => void;

  // Snap / Grid
  showGrid: boolean;
  setShowGrid: (v: boolean) => void;
  snapToGrid: boolean;
  setSnapToGrid: (v: boolean) => void;

  // Layers / Order
  canReorder: boolean;
  onBringForward: () => void;
  onSendBackward: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
}) {
  // ✅ Default: additions closed, tools open
  const [open, setOpen] = useState<Record<SectionKey, boolean>>({
    quick: false,
    snap: false,
    layers: false,
    tools: true,
    tip: false,
  });

  const tools = useMemo(() => props.module.tools ?? [], [props.module.tools]);

  function toggle(key: SectionKey) {
    setOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <aside className="p-4">
      <div className="text-xs text-black/55">
        Double-click to drop · Scroll to zoom · Hold space to pan · Cmd/Ctrl+C/V/D
      </div>

      <div className="mt-4 space-y-3">
        {/* ✅ Quick actions */}
        <AccordionSection
          title="Quick actions"
          open={open.quick}
          onToggle={() => toggle("quick")}
          rightHint={
            props.canDelete || props.canLock || props.canDuplicate
              ? `${props.canDelete ? "" : ""}`
              : ""
          }
        >
          <div className="grid grid-cols-3 gap-2">
            <MiniButton
              disabled={!props.canDuplicate}
              onClick={props.onDuplicate}
            >
              Duplicate
            </MiniButton>

            <MiniButton
              disabled={!props.canLock}
              onClick={props.onToggleLock}
            >
              {props.isLockedSelection ? "Unlock" : "Lock"}
            </MiniButton>

            <MiniButton
              danger
              disabled={!props.canDelete}
              onClick={props.onDelete}
            >
              Delete
            </MiniButton>
          </div>
        </AccordionSection>

        {/* ✅ Snap / Grid */}
        <AccordionSection
          title="Snap / Grid"
          open={open.snap}
          onToggle={() => toggle("snap")}
          rightHint={
            props.showGrid || props.snapToGrid ? "On" : "Off"
          }
        >
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
            Snap applies when you move/resize items (rounds x/y/w/h).
          </div>
        </AccordionSection>

        {/* ✅ Layers / Order */}
        <AccordionSection
          title="Layers / Order"
          open={open.layers}
          onToggle={() => toggle("layers")}
          rightHint={props.canReorder ? "" : "Select item"}
        >
          <div className="grid grid-cols-2 gap-2">
            <MiniButton disabled={!props.canReorder} onClick={props.onBringForward}>
              Bring forward
            </MiniButton>
            <MiniButton disabled={!props.canReorder} onClick={props.onSendBackward}>
              Send backward
            </MiniButton>
            <MiniButton disabled={!props.canReorder} onClick={props.onBringToFront}>
              To front
            </MiniButton>
            <MiniButton disabled={!props.canReorder} onClick={props.onSendToBack}>
              To back
            </MiniButton>
          </div>

          <div className="mt-2 text-[11px] text-black/45">
            Shortcuts: ⌘] / ⌘[ and ⌘⇧] / ⌘⇧[
          </div>
        </AccordionSection>

        {/* ✅ Tools (kept open by default) */}
        <AccordionSection
          title="Tools"
          open={open.tools}
          onToggle={() => toggle("tools")}
        >
          <div className="space-y-2">
            {tools.map((t: any) => (
              <ToolButton
                key={t.id}
                label={t.label}
                active={props.tool === t.id}
                onClick={() => props.setTool(t.id)}
              />
            ))}
          </div>
        </AccordionSection>

        {/* ✅ Tip */}
        <AccordionSection
          title="Tip"
          open={open.tip}
          onToggle={() => toggle("tip")}
        >
          <div className="text-xs text-black/55">
            Cursor paste: copy, move mouse, paste — it lands under your cursor.
          </div>
        </AccordionSection>
      </div>
    </aside>
  );
}

/* ---------------- Accordion ---------------- */

function AccordionSection(props: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  rightHint?: string;
}) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white/70 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={props.onToggle}
        className="w-full px-4 py-3 flex items-center justify-between gap-3 hover:bg-black/5 transition"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-semibold text-black/75">
            {props.title}
          </span>
          {props.rightHint ? (
            <span className="text-[11px] text-black/40 truncate">
              {props.rightHint}
            </span>
          ) : null}
        </div>

        <span
          className={[
            "shrink-0 h-7 w-7 rounded-full border border-black/10 bg-white/70 inline-flex items-center justify-center",
            "transition-transform duration-200",
            props.open ? "rotate-180" : "rotate-0",
          ].join(" ")}
          aria-hidden="true"
        >
          <Chevron />
        </span>
      </button>

      {/* Smooth open/close using grid row animation */}
      <div
        className={[
          "grid transition-[grid-template-rows] duration-250 ease-out",
          props.open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        ].join(" ")}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-4">{props.children}</div>
        </div>
      </div>
    </div>
  );
}

function Chevron() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M6 8l4 4 4-4"
        stroke="rgba(15,23,42,0.65)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ---------------- Controls ---------------- */

function ToolButton(props: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={[
        "w-full rounded-2xl border px-4 py-3 text-left text-sm transition shadow-sm",
        props.active ? "border-black/15 bg-black/5" : "border-black/10 bg-white hover:bg-black/5",
      ].join(" ")}
    >
      {props.label}
    </button>
  );
}

function MiniButton(props: {
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
        props.danger
          ? "text-red-700 border-red-200 bg-white hover:bg-red-500/10"
          : "border-black/10 bg-white text-black/80",
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
