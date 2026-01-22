// apps/studio/app/studio/editor-core/canvas/components/FloatingToolbar/FloatingToolbar.tsx
"use client";

import React, { useRef, useState } from "react";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export type FloatingToolbarBox = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export default function FloatingToolbar(props: {
  box: FloatingToolbarBox;
  wrapSize: { w: number; h: number };

  locked: boolean;

  canRadius: boolean;
  currentRadius: number;

  editLabel: string;
  editOn: boolean;
  canEdit: boolean;

  canConvert: boolean;
  onConvert: (k: "rect" | "polygon" | "curvature" | "bezier") => void;

  onDuplicate: () => void;
  onToggleLock: () => void;
  onDelete: () => void;
  onToggleEdit: () => void;
  onSetRadius: (radius: number) => void;

  offset: { dx: number; dy: number } | null;
  onOffsetChange: (next: { dx: number; dy: number } | null) => void;
}) {
  const { left, top, width, height } = props.box;

  const [radiusOpen, setRadiusOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);

  const margin = 34;
  const toolbarH = 42;
  const halfW = 195;

  // anchor point: center above selection
  let baseX = left + width / 2;
  const yAbove = top - margin;
  const canPlaceAbove = yAbove - toolbarH > 12;

  let baseY = canPlaceAbove ? yAbove : top + height + margin;
  const transform = canPlaceAbove ? "translate(-50%, -100%)" : "translate(-50%, 0%)";

  // apply user drag offset (sticky)
  const dx = props.offset?.dx ?? 0;
  const dy = props.offset?.dy ?? 0;

  // clamp final position
  const x = clamp(baseX + dx, halfW, props.wrapSize.w - halfW);
  const y = clamp(baseY + dy, 10, props.wrapSize.h - 10);

  // --- drag handling (mouse + touch) ---
  const dragRef = useRef<{
    startClientX: number;
    startClientY: number;
    startDx: number;
    startDy: number;
    dragging: boolean;
  } | null>(null);

  function onDragStart(e: React.PointerEvent) {
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);

    dragRef.current = {
      startClientX: e.clientX,
      startClientY: e.clientY,
      startDx: props.offset?.dx ?? 0,
      startDy: props.offset?.dy ?? 0,
      dragging: true,
    };
  }

  function onDragMove(e: React.PointerEvent) {
    const st = dragRef.current;
    if (!st?.dragging) return;

    const nextDx = st.startDx + (e.clientX - st.startClientX);
    const nextDy = st.startDy + (e.clientY - st.startClientY);

    props.onOffsetChange({ dx: nextDx, dy: nextDy });
  }

  function onDragEnd(e: React.PointerEvent) {
    const st = dragRef.current;
    if (!st) return;
    st.dragging = false;
    dragRef.current = null;
    try {
      (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
    } catch {}
  }

  return (
    <div className="absolute z-30" style={{ left: x, top: y, transform }}>
      <div className="relative flex items-center gap-1 rounded-full border border-black/10 bg-white/88 shadow-md backdrop-blur px-2 py-1">
        {/* Drag handle (invisible, sits above the pill) */}
        <div
          className="absolute -top-3 left-1/2 -translate-x-1/2 h-6 w-20 rounded-full cursor-grab active:cursor-grabbing"
          title="Drag toolbar"
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
          onDoubleClick={() => props.onOffsetChange(null)}
          style={{ touchAction: "none" }}
        />

        <ToolIconButton title="Duplicate" onClick={props.onDuplicate}>
          <IconDuplicate />
        </ToolIconButton>

        <ToolIconButton title={props.locked ? "Unlock" : "Lock"} onClick={props.onToggleLock}>
          {props.locked ? <IconUnlock /> : <IconLock />}
        </ToolIconButton>

        <div className="w-px h-5 bg-black/10 mx-1" />

        <ToolIconButton
          title={props.editOn ? `Exit ${props.editLabel}` : `Edit (${props.editLabel})`}
          onClick={() => {
            props.onToggleEdit();
            setRadiusOpen(false);
            setConvertOpen(false);
          }}
          active={props.editOn}
          disabled={!props.canEdit}
        >
          <IconEdit />
        </ToolIconButton>

        <ToolIconButton
          title="Convert shape"
          onClick={() => {
            if (!props.canConvert) return;
            setConvertOpen((v) => !v);
            setRadiusOpen(false);
          }}
          disabled={!props.canConvert}
        >
          <IconMore />
        </ToolIconButton>

        <ToolIconButton
          title="Corner radius"
          onClick={() => {
            if (!props.canRadius) return;
            setRadiusOpen((v) => !v);
            setConvertOpen(false);
          }}
          disabled={!props.canRadius}
        >
          <IconRadius />
        </ToolIconButton>

        <ToolIconButton title="Delete" onClick={props.onDelete} danger>
          <IconTrash />
        </ToolIconButton>

        {radiusOpen ? (
          <div className="absolute left-1/2 bottom-full mb-2 -translate-x-1/2 rounded-2xl border border-black/10 bg-white/95 shadow-lg backdrop-blur px-3 py-3 w-55">
            <div className="text-[11px] text-black/60 mb-2">Corner radius</div>
            <input
              type="range"
              min={0}
              max={220}
              step={1}
              value={Math.round(props.currentRadius)}
              onChange={(e) => props.onSetRadius(Number(e.target.value))}
              className="w-full"
            />
            <div className="mt-2 text-[11px] text-black/45">{Math.round(props.currentRadius)} px</div>
          </div>
        ) : null}

        {convertOpen ? (
          <div className="absolute left-1/2 bottom-full mb-2 -translate-x-1/2 rounded-2xl border border-black/10 bg-white/95 shadow-lg backdrop-blur px-3 py-3 w-64">
            <div className="text-[11px] text-black/60 mb-2">Convert shape</div>

            <button
              type="button"
              onClick={() => {
                props.onConvert("rect");
                setConvertOpen(false);
              }}
              className="w-full text-left text-[12px] px-3 py-2 rounded-xl border border-black/10 hover:bg-black/5 transition"
            >
              Rectangle (Live corners)
            </button>

            <button
              type="button"
              onClick={() => {
                props.onConvert("polygon");
                setConvertOpen(false);
              }}
              className="mt-2 w-full text-left text-[12px] px-3 py-2 rounded-xl border border-black/10 hover:bg-black/5 transition"
            >
              Polygon (straight edges)
            </button>

            <button
              type="button"
              onClick={() => {
                props.onConvert("curvature");
                setConvertOpen(false);
              }}
              className="mt-2 w-full text-left text-[12px] px-3 py-2 rounded-xl border border-black/10 hover:bg-black/5 transition"
            >
              Curvature (sleek, anchor-only)
            </button>

            <button
              type="button"
              onClick={() => {
                props.onConvert("bezier");
                setConvertOpen(false);
              }}
              className="mt-2 w-full text-left text-[12px] px-3 py-2 rounded-xl border border-black/10 hover:bg-black/5 transition"
            >
              Bezier (advanced)
            </button>

            <div className="mt-2 text-[11px] text-black/45 leading-snug">
              Curvature is the sleek Illustrator-like mode. Bezier is advanced.
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ToolIconButton(props: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      title={props.title}
      onClick={props.onClick}
      disabled={props.disabled}
      className={[
        "h-8 w-8 inline-flex items-center justify-center rounded-full transition",
        props.disabled ? "opacity-35 cursor-not-allowed" : "",
        props.active ? "bg-black/5 ring-1 ring-black/10" : "",
        props.danger ? "hover:bg-red-500/10 text-red-700" : "hover:bg-black/5 text-black/80",
      ].join(" ")}
    >
      {props.children}
    </button>
  );
}

/* ---------------- Icons ---------------- */

function IconDuplicate() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M7 7h8v8H7V7Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path
        d="M5 13H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v1"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconLock() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M6.5 9V7.2A3.5 3.5 0 0 1 10 3.7a3.5 3.5 0 0 1 3.5 3.5V9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M6 9h8a1 1 0 0 1 1 1v5.3a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V10a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconUnlock() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M13.5 9V7.5A3.5 3.5 0 0 0 10 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M6 9h8a1 1 0 0 1 1 1v5.3a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V10a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M7 6h6M8 6V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M6.5 6.5l.6 10a1 1 0 0 0 1 .9h3.8a1 1 0 0 0 1-.9l.6-10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconRadius() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M5 15V8a3 3 0 0 1 3-3h7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path d="M11 5h4v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M8 12a4 4 0 0 0 4-4" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
    </svg>
  );
}

function IconEdit() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M4 14.5V16h1.5l8.8-8.8-1.5-1.5L4 14.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M11.9 5.1l1.5 1.5 1-1a1 1 0 0 0 0-1.4l-.1-.1a1 1 0 0 0-1.4 0l-1 1Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconMore() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="6" cy="10" r="1.5" fill="currentColor" opacity="0.9" />
      <circle cx="10" cy="10" r="1.5" fill="currentColor" opacity="0.9" />
      <circle cx="14" cy="10" r="1.5" fill="currentColor" opacity="0.9" />
    </svg>
  );
}