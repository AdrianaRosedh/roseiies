// apps/studio/app/studio/editor-core/LeftToolbar.tsx
"use client";

import React, {
  useMemo,
  useRef,
  useState,
  useLayoutEffect,
  useEffect,
  type Dispatch,
  type SetStateAction,
} from "react";
import { createPortal } from "react-dom";
import type { StudioModule, ItemType } from "./types";

export type TreeVariant = "tree-01" | "tree-02" | "tree-03" | "tree-04" | "citrus";
const TREE_VARIANTS: TreeVariant[] = ["tree-01", "tree-02", "tree-03", "tree-04", "citrus"];

type SectionKey = "elements" | "properties" | "grid" | "quick";

type AlignTo = "selection" | "plot";

export default function LeftToolbar(props: {
  module: StudioModule;
  tool: ItemType;
  setTool: (t: ItemType) => void;

  quickInsert?: (t: ItemType) => void;

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

  // ✅ NEW: Illustrator-style arrange
  canArrange?: boolean;
  canDistribute?: boolean;
  alignTo?: AlignTo;
  setAlignTo?: (v: AlignTo) => void;
  onAlign?: (k: "left" | "center" | "right" | "top" | "middle" | "bottom") => void;
  onDistribute?: (axis: "x" | "y") => void;
}) {
  const [open, setOpen] = useState<Record<SectionKey, boolean>>({
    quick: false,
    grid: false,
    properties: true,
    elements: true,
  });

  function toggle(k: SectionKey) {
    setOpen((prev) => ({ ...prev, [k]: !prev[k] }));
  }

  const tools = useMemo(() => props.module.tools ?? [], [props.module.tools]);

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

  // ✅ Esc closes tree popover
  useEffect(() => {
    if (!treePickerOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      closeTreePicker();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [treePickerOpen]);

  function onToolClick(t: ItemType) {
    if (t !== "tree" && props.setTreePlacing) props.setTreePlacing(false);

    if (t === "tree") {
      props.setTool("tree");
      openTreePicker();
      return;
    }

    props.setTool(t);
    props.quickInsert?.(t);
  }

  function chooseTree(v: TreeVariant) {
    props.setTreeVariant?.(v);
    props.setTool("tree");
    props.setTreePlacing?.(true);
    closeTreePicker();
  }

  const alignTo = props.alignTo ?? "selection";

  return (
    <aside className="px-2 pb-2">
      <div className="mt-2 space-y-2">
        <Section title="Tools" open={open.elements} onToggle={() => toggle("elements")}>
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
        </Section>

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

        {/* ✅ Illustrator-style properties */}
        <Section title="Properties" open={open.properties} onToggle={() => toggle("properties")}>
          <div className="rounded-2xl border border-black/10 bg-white/70 p-3 shadow-sm">
            <div className="text-[12px] font-semibold text-black/70">Align Objects</div>

            <div className="mt-3 grid grid-cols-3 gap-3">
              <IconBtn
                title="Align left"
                disabled={!props.canArrange}
                onClick={() => props.onAlign?.("left")}
                icon={<IAlignLeft />}
              />
              <IconBtn
                title="Align center"
                disabled={!props.canArrange}
                onClick={() => props.onAlign?.("center")}
                icon={<IAlignCenter />}
              />
              <IconBtn
                title="Align right"
                disabled={!props.canArrange}
                onClick={() => props.onAlign?.("right")}
                icon={<IAlignRight />}
              />
            
              <IconBtn
                title="Align top"
                disabled={!props.canArrange}
                onClick={() => props.onAlign?.("top")}
                icon={<IAlignTop />}
              />
              <IconBtn
                title="Align middle"
                disabled={!props.canArrange}
                onClick={() => props.onAlign?.("middle")}
                icon={<IAlignMiddle />}
              />
              <IconBtn
                title="Align bottom"
                disabled={!props.canArrange}
                onClick={() => props.onAlign?.("bottom")}
                icon={<IAlignBottom />}
              />
            </div>
                      

            <div className="mt-4 text-[12px] font-semibold text-black/70">Distribute Objects</div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <IconBtn
                title="Distribute horizontal"
                disabled={!props.canDistribute}
                onClick={() => props.onDistribute?.("x")}
                icon={<IDistributeX />}
              />
              <IconBtn
                title="Distribute vertical"
                disabled={!props.canDistribute}
                onClick={() => props.onDistribute?.("y")}
                icon={<IDistributeY />}
              />
            </div>


            <div className="mt-4 flex items-center justify-between">
              <div className="text-[12px] font-semibold text-black/70">Align To</div>
              <div className="flex items-center gap-1 rounded-xl border border-black/10 bg-white/80 p-1">
                <Seg
                  active={alignTo === "selection"}
                  onClick={() => props.setAlignTo?.("selection")}
                  title="Selection"
                >
                  <ISelection />
                </Seg>
                <Seg
                  active={alignTo === "plot"}
                  onClick={() => props.setAlignTo?.("plot")}
                  title="Plot"
                >
                  <IPlot />
                </Seg>
              </div>
            </div>
          </div>

          {/* Order controls still useful */}
          <div className="mt-3 rounded-2xl border border-black/10 bg-white/70 p-3 shadow-sm">
            <div className="text-[12px] font-semibold text-black/70">Order</div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <MiniButton disabled={!props.canReorder} onClick={() => props.onBringForward?.()}>
                Bring fwd
              </MiniButton>
              <MiniButton disabled={!props.canReorder} onClick={() => props.onSendBackward?.()}>
                Send back
              </MiniButton>
              <MiniButton disabled={!props.canReorder} onClick={() => props.onBringToFront?.()}>
                To front
              </MiniButton>
              <MiniButton disabled={!props.canReorder} onClick={() => props.onSendToBack?.()}>
                To back
              </MiniButton>
            </div>
          </div>
        </Section>

        <Section title="Grid" open={open.grid} onToggle={() => toggle("grid")}>
          <ToggleRow
            label="Show grid"
            value={!!props.showGrid}
            onChange={(v) => props.setShowGrid?.(v)}
          />
          <ToggleRow
            label="Snap to grid"
            value={!!props.snapToGrid}
            onChange={(v) => props.setSnapToGrid?.(v)}
          />
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
  const width = 420;

  const rightX = props.anchor.right + gap;
  const leftX = props.anchor.left - gap - width;
  const fitsRight = rightX + width < window.innerWidth - 12;

  const x = Math.max(12, Math.min(fitsRight ? rightX : leftX, window.innerWidth - width - 12));
  const y = Math.max(12, Math.min(props.anchor.top - 10, window.innerHeight - 300));

  return (
    <div className="fixed z-9999" style={{ left: x, top: y, width }} role="dialog" aria-modal="true">
      <div className="rounded-3xl border border-black/10 bg-white/90 shadow-xl backdrop-blur p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-black/80">Choose a tree</div>
          <button
            type="button"
            onClick={props.onClose}
            className="h-9 w-9 rounded-full border border-black/10 bg-white/70 hover:bg-black/5 transition flex items-center justify-center"
            title="Close"
            aria-label="Close"
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
                  "flex items-center justify-center",
                  active ? "border-black/20 ring-1 ring-black/10" : "border-black/10",
                ].join(" ")}
                title={v}
                aria-label={v}
              >
                <img src={`/images/trees/${v}.svg`} alt={v} className="h-16 w-16" draggable={false} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ---------------- UI bits ---------------- */

function Section(props: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white/60 shadow-sm overflow-hidden">
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

      <div
        className={[
          "grid transition-[grid-template-rows] duration-250 ease-out",
          props.open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        ].join(" ")}
      >
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

function ToggleRow(props: { label: string; value: boolean; onChange: (v: boolean) => void }) {
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

function IconBtn(props: {
  title: string;
  icon: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={props.title}
      aria-label={props.title}
      onClick={props.onClick}
      disabled={props.disabled}
      className={[
        "relative grid place-items-center",
        "h-11 w-11 rounded-2xl border shadow-sm transition",
        props.disabled
          ? "opacity-35 cursor-not-allowed border-black/10 bg-white/60"
          : "border-black/10 bg-white hover:bg-black/5",
      ].join(" ")}
    >
      {/* ✅ force icon to be normal flow even if global css targets svg */}
      <span className="relative block [&_svg]:static [&_svg]:block">
        {props.icon}
      </span>
    </button>
  );
}

function Seg(props: { active: boolean; title: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={props.title}
      aria-label={props.title}
      onClick={props.onClick}
      className={[
        "h-9 w-9 rounded-lg border transition flex items-center justify-center",
        props.active ? "border-black/20 bg-black/5" : "border-black/10 bg-white hover:bg-black/5",
      ].join(" ")}
    >
      {props.children}
    </button>
  );
}

/* ---------------- Icons (simple, clean, modern) ---------------- */

const S = "rgba(15,23,42,0.65)";

function IconBase(props: { children: React.ReactNode }) {
  return (
    <svg
      className="static block"   // ✅ prevents stacking if global css hits svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      aria-hidden="true"
    >
      {props.children}
    </svg>
  );
}

function IAlignLeft() {
  return (
    <IconBase>
      <path d="M3 3v12" stroke={S} strokeWidth="1.6" strokeLinecap="round" />
      <rect x="5.2" y="5" width="8.8" height="3" rx="1.2" fill="rgba(15,23,42,0.18)" />
      <rect x="5.2" y="10" width="6.6" height="3" rx="1.2" fill="rgba(15,23,42,0.18)" />
    </IconBase>
  );
}
function IAlignCenter() {
  return (
    <IconBase>
      <path d="M9 3v12" stroke={S} strokeWidth="1.6" strokeLinecap="round" />
      <rect x="4.2" y="5" width="9.6" height="3" rx="1.2" fill="rgba(15,23,42,0.18)" />
      <rect x="5.4" y="10" width="7.2" height="3" rx="1.2" fill="rgba(15,23,42,0.18)" />
    </IconBase>
  );
}
function IAlignRight() {
  return (
    <IconBase>
      <path d="M15 3v12" stroke={S} strokeWidth="1.6" strokeLinecap="round" />
      <rect x="4" y="5" width="8.8" height="3" rx="1.2" fill="rgba(15,23,42,0.18)" />
      <rect x="6.2" y="10" width="6.6" height="3" rx="1.2" fill="rgba(15,23,42,0.18)" />
    </IconBase>
  );
}
function IAlignTop() {
  return (
    <IconBase>
      <path d="M3 3h12" stroke={S} strokeWidth="1.6" strokeLinecap="round" />
      <rect x="5" y="5.2" width="3" height="8.8" rx="1.2" fill="rgba(15,23,42,0.18)" />
      <rect x="10" y="5.2" width="3" height="6.6" rx="1.2" fill="rgba(15,23,42,0.18)" />
    </IconBase>
  );
}
function IAlignMiddle() {
  return (
    <IconBase>
      <path d="M3 9h12" stroke={S} strokeWidth="1.6" strokeLinecap="round" />
      <rect x="5" y="4.2" width="3" height="9.6" rx="1.2" fill="rgba(15,23,42,0.18)" />
      <rect x="10" y="5.4" width="3" height="7.2" rx="1.2" fill="rgba(15,23,42,0.18)" />
    </IconBase>
  );
}
function IAlignBottom() {
  return (
    <IconBase>
      <path d="M3 15h12" stroke={S} strokeWidth="1.6" strokeLinecap="round" />
      <rect x="5" y="4" width="3" height="8.8" rx="1.2" fill="rgba(15,23,42,0.18)" />
      <rect x="10" y="6.2" width="3" height="6.6" rx="1.2" fill="rgba(15,23,42,0.18)" />
    </IconBase>
  );
}
function IDistributeX() {
  return (
    <IconBase>
      <path d="M4 4v10" stroke={S} strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />
      <path d="M14 4v10" stroke={S} strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />
      <rect x="6" y="5.5" width="2.8" height="7" rx="1.1" fill="rgba(15,23,42,0.18)" />
      <rect x="10.2" y="5.5" width="2.8" height="7" rx="1.1" fill="rgba(15,23,42,0.18)" />
    </IconBase>
  );
}
function IDistributeY() {
  return (
    <IconBase>
      <path d="M4 4h10" stroke={S} strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />
      <path d="M4 14h10" stroke={S} strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />
      <rect x="5.5" y="6" width="7" height="2.8" rx="1.1" fill="rgba(15,23,42,0.18)" />
      <rect x="5.5" y="10.2" width="7" height="2.8" rx="1.1" fill="rgba(15,23,42,0.18)" />
    </IconBase>
  );
}
function ISelection() {
  return (
    <IconBase>
      <rect x="4" y="4" width="10" height="10" rx="2" stroke={S} strokeWidth="1.4" strokeDasharray="2.2 2.2" />
    </IconBase>
  );
}
function IPlot() {
  return (
    <IconBase>
      <rect x="3.5" y="3.5" width="11" height="11" rx="2" stroke={S} strokeWidth="1.4" />
      <rect x="6" y="6" width="6" height="6" rx="1.5" fill="rgba(15,23,42,0.12)" />
    </IconBase>
  );
}