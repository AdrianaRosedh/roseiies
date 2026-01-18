"use client";

import type { Garden, Layout, StudioModule, WorkspaceStore } from "./types";

export default function TopBar(props: {
  module: StudioModule;
  state: WorkspaceStore;
  activeGarden: Garden | null;
  layoutsForGarden: Layout[];
  activeLayout: Layout | null;
  stageScale: number;
  panMode: boolean;

  onSetGarden: (id: string) => void;
  onSetLayout: (id: string) => void;

  onNewGarden: () => void;
  onRenameGarden: () => void;
  onNewLayout: () => void;
  onRenameLayout: () => void;
  onPublish: () => void;

  onResetView: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onDelete: () => void;

  canCopy: boolean;
  canPaste: boolean;
  canDelete: boolean;
}) {
  const {
    state,
    layoutsForGarden,
    activeGarden,
    activeLayout,
    stageScale,
    panMode,
  } = props;

  return (
    <header className="h-14 flex items-center justify-between border border-black/10 bg-white/55 backdrop-blur px-3 rounded-xl shadow-sm">
      <div className="flex items-center gap-2">
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

        <button className={btn("ghost")} onClick={props.onRenameGarden} disabled={!activeGarden}>
          Rename
        </button>

        <button className={btn("ghost")} onClick={props.onNewGarden}>
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

        <button className={btn("ghost")} onClick={props.onRenameLayout} disabled={!activeLayout}>
          Rename
        </button>

        <button className={btn("ghost")} onClick={props.onNewLayout} disabled={!state.activeGardenId}>
          + Layout
        </button>

        <button className={btn("primary")} onClick={props.onPublish} disabled={!activeLayout}>
          Publish
        </button>
      </div>

      <div className="flex items-center gap-2">
        <span className="rounded-full border border-black/10 bg-white px-3 py-2 text-xs text-black/70 shadow-sm">
          Zoom: {Math.round(stageScale * 100)}%
        </span>

        <span className="rounded-full border border-black/10 bg-white px-3 py-2 text-xs text-black/70 shadow-sm">
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
