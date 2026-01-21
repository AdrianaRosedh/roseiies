"use client";

import { useMemo, useState } from "react";
import type { Garden, Layout, StudioModule, WorkspaceStore } from "./types";
import Modal from "./ui/Modal";

type Mode = null | "newGarden" | "renameGarden" | "newLayout" | "renameLayout";

export type PublishResult =
  | { ok: true; itemsWritten?: number }
  | { ok: false; error: string };

export default function TopBar(props: {
  module: StudioModule;
  state: WorkspaceStore;
  activeGarden: Garden | null;
  layoutsForGarden: Layout[];
  activeLayout: Layout | null;

  stageScale: number;
  panMode: boolean;

  onBack?: () => void;

  onSetGarden: (id: string) => void;
  onSetLayout: (id: string) => void;

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

  // ✅ NEW: let StudioShellInner open mobile sheets
  onOpenMobileMore?: () => void;
  onOpenMobileContext?: () => void;
}) {
  const { state, layoutsForGarden, activeGarden, activeLayout, stageScale, panMode } = props;

  const [mode, setMode] = useState<Mode>(null);
  const [value, setValue] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const publishedDot = useMemo(() => (activeLayout?.published ? "●" : ""), [activeLayout]);

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

  async function runPublish() {
    if (!activeLayout) return;

    try {
      setPublishing(true);
      setStatus(null);

      const maybe = props.onPublish();
      if (maybe && typeof (maybe as any).then === "function") {
        const res = (await maybe) as PublishResult;
        if (res.ok) {
          setStatus(`Published${res.itemsWritten != null ? ` · ${res.itemsWritten} items` : ""}`);
        } else {
          setStatus(`Publish failed · ${res.error}`);
        }
      } else {
        setStatus("Published");
      }
    } finally {
      setPublishing(false);
      window.setTimeout(() => setStatus(null), 2400);
    }
  }

  return (
    <div className="w-full">
      {/* ✅ Mobile header (compact) */}
      <header className="md:hidden h-12 flex items-center justify-between gap-2 border border-black/10 bg-white/60 backdrop-blur px-3 rounded-xl shadow-sm">
        <div className="flex items-center gap-2 min-w-0">
          {props.onBack ? (
            <button
              onClick={props.onBack}
              className="h-9 w-9 rounded-xl border border-black/10 bg-white/80 shadow-sm hover:bg-black/5 inline-flex items-center justify-center"
              title="Back"
              aria-label="Back"
            >
              ←
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => props.onOpenMobileContext?.()}
            className="h-9 px-3 rounded-xl border border-black/10 bg-white/80 shadow-sm hover:bg-black/5 text-xs text-black/80 truncate max-w-[55vw]"
            title="Garden / Layout"
          >
            {activeGarden?.name ?? "Garden"} · {activeLayout?.name ?? "Layout"}
            {activeLayout?.published ? " ●" : ""}
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="rounded-xl border border-black/10 bg-white/80 px-3 py-2 text-xs text-black/70 shadow-sm">
            {Math.round(stageScale * 100)}%
          </span>

          <button
            type="button"
            onClick={() => props.onOpenMobileMore?.()}
            className="h-9 w-9 rounded-xl border border-black/10 bg-white/80 shadow-sm hover:bg-black/5 inline-flex items-center justify-center"
            title="More"
            aria-label="More"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <circle cx="6" cy="10" r="1.5" fill="rgba(15,23,42,0.75)" />
              <circle cx="10" cy="10" r="1.5" fill="rgba(15,23,42,0.75)" />
              <circle cx="14" cy="10" r="1.5" fill="rgba(15,23,42,0.75)" />
            </svg>
          </button>
        </div>
      </header>

      {/* ✅ Desktop header (your existing UI) */}
      <header className="hidden md:flex h-14 items-center justify-between gap-3 border border-black/10 bg-white/60 backdrop-blur px-3 rounded-xl shadow-sm">
        {/* LEFT: garden + layout */}
        <div className="flex items-center gap-2 min-w-0">
          {props.onBack ? (
            <button
              onClick={props.onBack}
              className="rounded-lg border border-black/10 bg-white px-3 py-2 text-xs text-black/80 shadow-sm hover:bg-black/5"
              title="Back to Workplace"
              aria-label="Back to Workplace"
            >
              ←
            </button>
          ) : null}

          <select
            value={state.activeGardenId ?? ""}
            onChange={(e) => props.onSetGarden(e.target.value)}
            className="rounded-lg border border-black/10 bg-white px-3 py-2 text-xs shadow-sm"
          >
            {state.gardens.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>

          <button className={btn("ghost")} onClick={() => open("renameGarden")} disabled={!activeGarden}>
            Rename
          </button>

          <button className={btn("ghost")} onClick={() => open("newGarden")}>
            + Garden
          </button>

          <span className="mx-2 h-5 w-px bg-black/10" />

          <select
            value={state.activeLayoutId ?? ""}
            onChange={(e) => props.onSetLayout(e.target.value)}
            className="rounded-lg border border-black/10 bg-white px-3 py-2 text-xs shadow-sm"
          >
            {layoutsForGarden.map((l) => (
              <option key={l.id} value={l.id}>
                {l.published ? "● " : ""}
                {l.name}
              </option>
            ))}
          </select>

          <button className={btn("ghost")} onClick={() => open("renameLayout")} disabled={!activeLayout}>
            Rename
          </button>

          <button className={btn("ghost")} onClick={() => open("newLayout")} disabled={!state.activeGardenId}>
            + Layout
          </button>

          <button
            className={btn("primary")}
            onClick={runPublish}
            disabled={!activeLayout || publishing}
            title="Publish this layout"
          >
            {publishing ? "Publishing…" : `Publish ${publishedDot}`.trim()}
          </button>
        </div>

        {/* RIGHT: edit controls */}
        <div className="flex items-center gap-2 shrink-0">
          {status ? (
            <span className="hidden md:inline-flex rounded-full border border-black/10 bg-white px-3 py-2 text-xs text-black/70 shadow-sm">
              {status}
            </span>
          ) : null}

          <span className="rounded-full border border-black/10 bg-white px-3 py-2 text-xs text-black/70 shadow-sm">
            Zoom: {Math.round(stageScale * 100)}%
          </span>

          <span className="hidden md:inline-flex rounded-full border border-black/10 bg-white px-3 py-2 text-xs text-black/70 shadow-sm">
            {panMode ? "Pan: ON (space)" : "Pan: hold space"}
          </span>

          <button className={btn("ghost")} onClick={props.onResetView}>
            Reset
          </button>

          <button className={btn("ghost")} onClick={props.onCopy} disabled={!props.canCopy}>
            Copy
          </button>

          <button className={btn("ghost")} onClick={props.onPaste} disabled={!props.canPaste}>
            Paste
          </button>

          <button className={btn("danger")} onClick={props.onDelete} disabled={!props.canDelete}>
            Delete
          </button>
        </div>
      </header>

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

function btn(kind: "ghost" | "primary" | "danger") {
  if (kind === "primary") {
    return "rounded-lg border border-black/10 bg-[rgba(94,118,88,0.18)] px-3 py-2 text-xs text-black shadow-sm hover:bg-[rgba(94,118,88,0.24)] disabled:opacity-50";
  }
  if (kind === "danger") {
    return "rounded-lg border border-black/10 bg-red-500/10 px-3 py-2 text-xs text-red-700 shadow-sm hover:bg-red-500/15 disabled:opacity-50";
  }
  return "rounded-lg border border-black/10 bg-white px-3 py-2 text-xs text-black/80 shadow-sm hover:bg-black/5 disabled:opacity-50";
}