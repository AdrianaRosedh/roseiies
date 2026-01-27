"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Modal from "../../../editor-core/ui/Modal";
import {
  tbBtn,
  tbSelect,
} from "../../../editor-core/shell/components/toolbarStyles";

type Mode = null | "newGarden" | "renameGarden" | "newLayout" | "renameLayout";

export type PublishResult =
  | { ok: true; itemsWritten?: number }
  | { ok: false; error: string };

export default function GardenMapToolbar(props: {
  state: any;
  activeGarden: any | null;
  layoutsForGarden: any[];
  activeLayout: any | null;

  onBack?: () => void;

  onSetGarden: (id: string) => void;
  onSetLayout: (id: string) => void;
}) {
  const { state, layoutsForGarden } = props;

  return (
    <div className="flex items-center gap-2 min-w-0">
      {props.onBack ? (
        <button onClick={props.onBack} className={tbBtn("ghost")} title="Back">
          ←
        </button>
      ) : null}

      <select
        value={state.activeGardenId ?? ""}
        onChange={(e) => props.onSetGarden(e.target.value)}
        className={tbSelect}
      >
        {(state.gardens ?? []).map((g: any) => (
          <option key={g.id} value={g.id}>
            {g.name}
          </option>
        ))}
      </select>

      <select
        value={state.activeLayoutId ?? ""}
        onChange={(e) => props.onSetLayout(e.target.value)}
        className={tbSelect}
        disabled={!state.activeGardenId}
      >
        {layoutsForGarden.map((l: any) => (
          <option key={l.id} value={l.id}>
            {l.published ? "● " : ""}
            {l.name}
          </option>
        ))}
      </select>
    </div>
  );
}

/** RIGHT side actions for Map: Publish, Zoom, Reset, and ⋯ menu */
export function GardenMapActions(props: {
  state: any;
  activeGarden: any | null;
  activeLayout: any | null;
  stageScale: number;

  onNewGarden: (name: string) => void;
  onRenameGarden: (name: string) => void;
  onNewLayout: (name: string) => void;
  onRenameLayout: (name: string) => void;

  onPublish: () => void | Promise<PublishResult>;
  onResetView: () => void;

  onCopy: () => void;
  onPaste: () => void;
  onDelete: () => void;

  canCopy: boolean;
  canPaste: boolean;
  canDelete: boolean;
}) {
  const { activeGarden, activeLayout, stageScale } = props;

  const [publishing, setPublishing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const publishedDot = useMemo(
    () => (activeLayout?.published ? "●" : ""),
    [activeLayout]
  );

  async function runPublish() {
    if (!activeLayout) return;

    try {
      setPublishing(true);
      setStatus(null);

      const maybe = props.onPublish();
      if (maybe && typeof (maybe as any).then === "function") {
        const res = (await maybe) as PublishResult;
        setStatus(res.ok ? "Published" : `Publish failed · ${res.error}`);
      } else {
        setStatus("Published");
      }
    } finally {
      setPublishing(false);
      window.setTimeout(() => setStatus(null), 2400);
    }
  }

  // --- More menu + rename/create modals ---
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocDown(e: MouseEvent) {
      if (!moreRef.current) return;
      if (!moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMoreOpen(false);
    }
    document.addEventListener("mousedown", onDocDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const [mode, setMode] = useState<Mode>(null);
  const [value, setValue] = useState("");

  function open(m: Exclude<Mode, null>) {
    setMode(m);
    if (m === "newGarden") setValue("");
    if (m === "renameGarden") setValue(activeGarden?.name ?? "");
    if (m === "newLayout") setValue("");
    if (m === "renameLayout") setValue(activeLayout?.name ?? "");
  }
  function close() {
    setMode(null);
    setValue("");
  }
  function submit() {
    const name = value.trim();
    if (!name) return;

    if (mode === "newGarden") props.onNewGarden(name);
    if (mode === "renameGarden") props.onRenameGarden(name);
    if (mode === "newLayout") props.onNewLayout(name);
    if (mode === "renameLayout") props.onRenameLayout(name);

    close();
  }

  return (
    <div className="flex items-center gap-2 shrink-0">
      {status ? (
        <span className="hidden lg:inline-flex rounded-full border border-black/10 bg-white px-3 py-2 text-xs text-black/70 shadow-sm">
          {status}
        </span>
      ) : null}

      <button
        className={tbBtn("primary")}
        onClick={runPublish}
        disabled={!activeLayout || publishing}
        title="Publish this layout"
      >
        {publishing ? "Publishing…" : `Publish ${publishedDot}`.trim()}
      </button>

      <span className="rounded-full border border-black/10 bg-white px-3 py-2 text-xs text-black/70 shadow-sm">
        Zoom: {Math.round(stageScale * 100)}%
      </span>

      <button className={tbBtn("ghost")} onClick={props.onResetView}>
        Reset
      </button>

      {/* ⋯ menu */}
      <div className="relative" ref={moreRef}>
        <button
          className={tbBtn("ghost")}
          onClick={() => setMoreOpen((v) => !v)}
          title="More"
          aria-label="More"
        >
          ⋯
        </button>

        {moreOpen ? (
          <div className="absolute right-0 mt-2 w-56 rounded-xl border border-black/10 bg-white/95 backdrop-blur shadow-lg overflow-hidden z-50">
            <div className="px-3 py-2 text-[11px] uppercase tracking-wide text-black/40">
              Manage
            </div>

            <button
              className="w-full text-left px-3 py-2 text-sm hover:bg-black/5"
              onClick={() => {
                setMoreOpen(false);
                open("renameGarden");
              }}
              disabled={!activeGarden}
            >
              Rename garden…
            </button>

            <button
              className="w-full text-left px-3 py-2 text-sm hover:bg-black/5"
              onClick={() => {
                setMoreOpen(false);
                open("newGarden");
              }}
            >
              New garden…
            </button>

            <div className="h-px bg-black/10" />

            <button
              className="w-full text-left px-3 py-2 text-sm hover:bg-black/5"
              onClick={() => {
                setMoreOpen(false);
                open("renameLayout");
              }}
              disabled={!activeLayout}
            >
              Rename layout…
            </button>

            <button
              className="w-full text-left px-3 py-2 text-sm hover:bg-black/5"
              onClick={() => {
                setMoreOpen(false);
                open("newLayout");
              }}
              disabled={!props.state.activeGardenId}
            >
              New layout…
            </button>

            <div className="h-px bg-black/10" />

            <div className="px-3 py-2 text-[11px] uppercase tracking-wide text-black/40">
              Edit
            </div>

            <button
              className="w-full text-left px-3 py-2 text-sm hover:bg-black/5 disabled:opacity-50"
              onClick={() => {
                setMoreOpen(false);
                props.onCopy();
              }}
              disabled={!props.canCopy}
            >
              Copy
            </button>

            <button
              className="w-full text-left px-3 py-2 text-sm hover:bg-black/5 disabled:opacity-50"
              onClick={() => {
                setMoreOpen(false);
                props.onPaste();
              }}
              disabled={!props.canPaste}
            >
              Paste
            </button>

            <button
              className="w-full text-left px-3 py-2 text-sm hover:bg-red-500/10 text-red-700 disabled:opacity-50"
              onClick={() => {
                setMoreOpen(false);
                props.onDelete();
              }}
              disabled={!props.canDelete}
            >
              Delete
            </button>
          </div>
        ) : null}
      </div>

      <Modal
        open={mode !== null}
        title={
          mode === "newGarden"
            ? "New garden"
            : mode === "renameGarden"
              ? "Rename garden"
              : mode === "newLayout"
                ? "New layout"
                : "Rename layout"
        }
        description="Use clear names. You can always rename later."
        onClose={close}
      >
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            if (e.key === "Escape") close();
          }}
          className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm"
          placeholder="e.g., Invernadero / Primavera 2026"
        />

        <div className="mt-4 flex justify-end gap-2">
          <button
            className="rounded-xl border border-black/10 bg-white/70 px-4 py-2 text-sm"
            onClick={close}
          >
            Cancel
          </button>
          <button
            className="rounded-xl border border-black/10 bg-black text-white px-4 py-2 text-sm"
            onClick={submit}
            disabled={!value.trim()}
          >
            Save
          </button>
        </div>
      </Modal>
    </div>
  );
}
