// apps/studio/app/studio/editor-core/LeftToolbar.tsx
"use client";

import React, {
  useMemo,
  useRef,
  useState,
  useLayoutEffect,
  type Dispatch,
  type SetStateAction,
} from "react";
import { createPortal } from "react-dom";
import type { StudioModule, ItemType } from "./types";

export type TreeVariant = "tree-01" | "tree-02" | "tree-03" | "tree-04" | "citrus";
const TREE_VARIANTS: TreeVariant[] = ["tree-01", "tree-02", "tree-03", "tree-04", "citrus"];

type SectionKey = "elements" | "properties" | "grid" | "quick";

export default function LeftToolbar(props: {
  module: StudioModule;
  tool: ItemType;

  // NOTE: some shells call setTool directly; we keep it required
  setTool: (t: ItemType) => void;

  // Optional: only available in the “new” shell wiring
  quickInsert?: (t: ItemType) => void;

  // ✅ placement mode (optional for backward compatibility)
  treePlacing?: boolean;
  setTreePlacing?: (v: boolean) => void;

  treeVariant?: TreeVariant;
  setTreeVariant?: Dispatch<SetStateAction<TreeVariant>>;

  // Quick actions
  canDuplicate?: boolean;
  canLock?: boolean;
  canDelete?: boolean;
  isLockedSelection?: boolean;
  onDuplicate?: () => void;
  onToggleLock?: () => void;
  onDelete?: () => void;

  // Grid
  showGrid?: boolean;
  setShowGrid?: (v: boolean) => void;
  snapToGrid?: boolean;
  setSnapToGrid?: (v: boolean) => void;

  // Order
  canReorder?: boolean;
  onBringForward?: () => void;
  onSendBackward?: () => void;
  onBringToFront?: () => void;
  onSendToBack?: () => void;

  // Arrange
  canArrange?: boolean;
  onAlign?: (k: "left" | "center" | "right" | "top" | "middle" | "bottom") => void;
  onDistribute?: (axis: "x" | "y") => void;
}) {
  const [open, setOpen] = useState<Record<SectionKey, boolean>>({
    quick: false,
    grid: false,
    properties: true,
    elements: true,
  });

  const tools = useMemo(() => props.module.tools ?? [], [props.module.tools]);

  function toggle(k: SectionKey) {
    setOpen((prev) => ({ ...prev, [k]: !prev[k] }));
  }

  const [treePickerOpen, setTreePickerOpen] = useState(false);
  const treeBtnRef = useRef<HTMLButtonElement | null>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

  function openTreePicker() {
    const el = treeBtnRef.current;
    if (!el) return;
    setAnchorRect(el.getBoundingClientRect());
    setTreePickerOpen(true);
  }
  function closeTreePicker() {
    setTreePickerOpen(false);
  }

  useLayoutEffect(() => {
    if (!treePickerOpen) return;

    const update = () => {
      const el = treeBtnRef.current;
      if (!el) return;
      setAnchorRect(el.getBoundingClientRect());
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [treePickerOpen]);

  function onToolClick(t: ItemType) {
    // If we have placement mode, switching away cancels it
    if (t !== "tree" && props.setTreePlacing) props.setTreePlacing(false);

    if (t === "tree") {
      props.setTool("tree");
      openTreePicker();
      return;
    }

    props.setTool(t);

    // Only do quick insert if host passed it
    props.quickInsert?.(t);
  }

  function chooseTree(v: TreeVariant) {
    props.setTreeVariant?.(v);
    props.setTool("tree");

    // ✅ only enable placement mode if host passed a setter
    props.setTreePlacing?.(true);

    closeTreePicker();
  }

  return (
    <aside className="px-2 pb-2">
      <div className="px-2 pt-1 text-[11px] text-black/45 leading-snug">
        Click: place · Scroll: zoom · Space: pan · ⌘/Ctrl+Z · Esc: exit modes
      </div>

      {props.treePlacing ? (
        <div className="mt-2 mx-2 rounded-2xl border border-black/10 bg-white/70 shadow-sm px-3 py-2 text-[12px] text-black/70">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              Placing trees{" "}
              <span className="text-black/40">({props.treeVariant ?? "tree-01"})</span>
            </div>
            <button
              type="button"
              onClick={() => props.setTreePlacing?.(false)}
              className="h-7 w-7 rounded-full border border-black/10 bg-white/70 hover:bg-black/5 transition flex items-center justify-center"
              title="Exit"
            >
              ✕
            </button>
          </div>
          <div className="mt-1 text-[11px] text-black/45">Click on canvas to place. Esc to exit.</div>
        </div>
      ) : null}

      <div className="mt-2 space-y-2">
        <Section title="Elements" open={open.elements} onToggle={() => toggle("elements")}>
          <div className="space-y-2">
            {tools.map((t: any) => {
              const isTree = t.id === "tree";
              return (
                <ElementButton
                  key={t.id}
                  label={t.label}
                  active={props.tool === t.id}
                  onClick={() => onToolClick(t.id)}
                  buttonRef={isTree ? treeBtnRef : undefined}
                  sublabel={isTree && props.treeVariant ? props.treeVariant : undefined}
                  rightIcon={isTree ? "chevron" : undefined}
                />
              );
            })}
          </div>

          <div className="mt-2 text-[11px] text-black/40">
            Tree: choose a style → then click on canvas to place.
          </div>
        </Section>

        {/* The rest of your sections can stay as-is; guarded with optional props */}
        <Section title="Quick" open={open.quick} onToggle={() => toggle("quick")}>
          <div className="grid grid-cols-3 gap-2">
            <MiniButton disabled={!props.canDuplicate} onClick={() => props.onDuplicate?.()}>
              Duplicate
            </MiniButton>
            <MiniButton disabled={!props.canLock} onClick={() => props.onToggleLock?.()}>
              {props.isLockedSelection ? "Unlock" : "Lock"}
            </MiniButton>
            <MiniButton danger disabled={!props.canDelete} onClick={() => props.onDelete?.()}>
              Delete
            </MiniButton>
          </div>
        </Section>

        <Section title="Properties" open={open.properties} onToggle={() => toggle("properties")}>
          <div className="text-[11px] text-black/55 mb-2">Arrange</div>
          <div className="grid grid-cols-3 gap-2">
            <MiniButton disabled={!props.canArrange} onClick={() => props.onAlign?.("left")}>Align L</MiniButton>
            <MiniButton disabled={!props.canArrange} onClick={() => props.onAlign?.("center")}>Align C</MiniButton>
            <MiniButton disabled={!props.canArrange} onClick={() => props.onAlign?.("right")}>Align R</MiniButton>
            <MiniButton disabled={!props.canArrange} onClick={() => props.onAlign?.("top")}>Align T</MiniButton>
            <MiniButton disabled={!props.canArrange} onClick={() => props.onAlign?.("middle")}>Align M</MiniButton>
            <MiniButton disabled={!props.canArrange} onClick={() => props.onAlign?.("bottom")}>Align B</MiniButton>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2">
            <MiniButton disabled={!props.canArrange} onClick={() => props.onDistribute?.("x")}>Distribute X</MiniButton>
            <MiniButton disabled={!props.canArrange} onClick={() => props.onDistribute?.("y")}>Distribute Y</MiniButton>
          </div>

          <div className="mt-4 text-[11px] text-black/55 mb-2">Order</div>
          <div className="grid grid-cols-2 gap-2">
            <MiniButton disabled={!props.canReorder} onClick={() => props.onBringForward?.()}>Bring fwd</MiniButton>
            <MiniButton disabled={!props.canReorder} onClick={() => props.onSendBackward?.()}>Send back</MiniButton>
            <MiniButton disabled={!props.canReorder} onClick={() => props.onBringToFront?.()}>To front</MiniButton>
            <MiniButton disabled={!props.canReorder} onClick={() => props.onSendToBack?.()}>To back</MiniButton>
          </div>
        </Section>

        <Section title="Grid" open={open.grid} onToggle={() => toggle("grid")}>
          <ToggleRow label="Show grid" value={!!props.showGrid} onChange={(v) => props.setShowGrid?.(v)} />
          <ToggleRow label="Snap to grid" value={!!props.snapToGrid} onChange={(v) => props.setSnapToGrid?.(v)} />
        </Section>
      </div>

      {treePickerOpen && anchorRect
        ? createPortal(
            <TreePickerPopover
              anchor={anchorRect}
              current={props.treeVariant ?? "tree-01"}
              onClose={closeTreePicker}
              onPick={chooseTree}
            />,
            document.body
          )
        : null}
    </aside>
  );
}

function TreePickerPopover(props: {
  anchor: DOMRect;
  current: TreeVariant;
  onClose: () => void;
  onPick: (v: TreeVariant) => void;
}) {
  const gap = 12;
  const width = 460;

  const rightX = props.anchor.right + gap;
  const leftX = props.anchor.left - gap - width;
  const fitsRight = rightX + width < window.innerWidth - 12;

  const x = Math.max(12, Math.min(fitsRight ? rightX : leftX, window.innerWidth - width - 12));
  const y = Math.max(12, Math.min(props.anchor.top - 10, window.innerHeight - 320));

  return (
    <div className="fixed z-9999" style={{ left: x, top: y, width }} role="dialog">
      <div className="rounded-3xl border border-black/10 bg-white/90 shadow-xl backdrop-blur p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-black/80">Choose a tree</div>
            <div className="text-[12px] text-black/45 mt-1">
              After picking, you’ll be in placement mode (click on canvas to place).
            </div>
          </div>
          <button
            type="button"
            onClick={props.onClose}
            className="h-9 w-9 rounded-full border border-black/10 bg-white/70 hover:bg-black/5 transition flex items-center justify-center"
            title="Close"
          >
            ✕
          </button>
        </div>

        <div className="mt-3 grid grid-cols-5 gap-2.5">
          {TREE_VARIANTS.map((v) => {
            const active = props.current === v;
            return (
              <button
                key={v}
                type="button"
                onClick={() => props.onPick(v)}
                className={[
                  "rounded-2xl border bg-white/85 hover:bg-black/5 transition p-3",
                  "flex flex-col items-center justify-center gap-2",
                  active ? "border-black/20 ring-1 ring-black/10" : "border-black/10",
                ].join(" ")}
                title={v}
              >
                <img src={`/images/trees/${v}.svg`} alt={v} className="h-16 w-16" draggable={false} />
                <span className="text-[11px] text-black/55">{v}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-3 text-[11px] text-black/45 flex items-center justify-between">
          <span>Esc exits placement mode.</span>
          <span className="opacity-70">No overlay.</span>
        </div>
      </div>
    </div>
  );
}

/* ---------------- UI bits ---------------- */

function Section(props: { title: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white/70 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={props.onToggle}
        className="w-full px-3 py-2.5 flex items-center justify-between gap-2 hover:bg-black/5 transition"
      >
        <span className="text-[12px] font-semibold text-black/75">{props.title}</span>
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

      <div className={["grid transition-[grid-template-rows] duration-250 ease-out", props.open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"].join(" ")}>
        <div className="overflow-hidden">
          <div className="px-3 pb-3">{props.children}</div>
        </div>
      </div>
    </div>
  );
}

function Chevron() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M6 8l4 4 4-4" stroke="rgba(15,23,42,0.65)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ElementButton(props: {
  label: string;
  sublabel?: string;
  active: boolean;
  onClick: () => void;
  buttonRef?: React.Ref<HTMLButtonElement>;
  rightIcon?: "chevron";
}) {
  return (
    <button
      ref={props.buttonRef}
      type="button"
      onClick={props.onClick}
      className={[
        "w-full rounded-2xl border px-4 py-3 text-left text-sm transition shadow-sm",
        "flex items-center justify-between gap-3",
        props.active ? "border-black/15 bg-black/5" : "border-black/10 bg-white hover:bg-black/5",
      ].join(" ")}
    >
      <div className="min-w-0">
        <div className="text-black/80">{props.label}</div>
        {props.sublabel ? <div className="text-[11px] text-black/45 truncate">{props.sublabel}</div> : null}
      </div>

      {props.rightIcon ? (
        <span className="h-7 w-7 rounded-full border border-black/10 bg-white/70 inline-flex items-center justify-center text-black/60">
          ▸
        </span>
      ) : null}
    </button>
  );
}

function MiniButton(props: { children: React.ReactNode; onClick: () => void; disabled?: boolean; danger?: boolean }) {
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

function ToggleRow(props: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 py-2">
      <span className="text-[12px] text-black/75">{props.label}</span>
      <input type="checkbox" checked={props.value} onChange={(e) => props.onChange(e.target.checked)} className="h-4 w-4" />
    </label>
  );
}
