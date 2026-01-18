"use client";

import type { StudioModule, ItemType } from "./types";

export default function LeftToolbar(props: {
  module: StudioModule;
  tool: ItemType;
  setTool: (t: ItemType) => void;
}) {
  return (
    <aside className="border-r border-black/10 bg-white/60 p-4">
      <div className="text-xs text-black/55">
        Double-click to drop · Scroll to zoom · Hold space to pan · Cmd/Ctrl+C/V/D
      </div>

      <div className="mt-5 space-y-2">
        {props.module.tools.map((t) => (
          <ToolButton
            key={t.id}
            label={t.label}
            active={props.tool === t.id}
            onClick={() => props.setTool(t.id)}
          />
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
        <div className="text-xs text-black/60">Tip</div>
        <div className="mt-2 text-xs text-black/55">
          Cursor paste: copy, move mouse, paste — it lands under your cursor.
        </div>
      </div>
    </aside>
  );
}

function ToolButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-2xl border px-4 py-3 text-left text-sm transition shadow-sm ${
        active ? "border-black/15 bg-black/5" : "border-black/10 bg-white hover:bg-black/5"
      }`}
    >
      {label}
    </button>
  );
}