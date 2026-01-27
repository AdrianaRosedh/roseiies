// apps/studio/app/studio/editor-core/shell/components/toolbarStyles.ts

export type ToolbarBtnKind = "ghost" | "primary" | "danger";

export function tbBtn(kind: ToolbarBtnKind) {
  // Match TopBar.tsx styles exactly (canonical)
  if (kind === "primary") {
    return "rounded-lg border border-black/10 bg-[rgba(94,118,88,0.18)] px-3 py-2 text-xs text-black shadow-sm hover:bg-[rgba(94,118,88,0.24)] disabled:opacity-50";
  }
  if (kind === "danger") {
    return "rounded-lg border border-black/10 bg-red-500/10 px-3 py-2 text-xs text-red-700 shadow-sm hover:bg-red-500/15 disabled:opacity-50";
  }
  return "rounded-lg border border-black/10 bg-white px-3 py-2 text-xs text-black/80 shadow-sm hover:bg-black/5 disabled:opacity-50";
}

export const tbSelect =
  "rounded-lg border border-black/10 bg-white px-3 py-2 text-xs shadow-sm";
