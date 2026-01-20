"use client";

/**
 * LEGACY FILE (DEPRECATED)
 *
 * This component was the early garden canvas prototype.
 * The active editor is now `studio/editor-core/*` (StudioShellInner, useWorkspaceStore, CanvasStage, Inspector).
 *
 * Why this stub exists:
 * - Prevent accidental usage
 * - Keep a stable import path if anything references it
 *
 * The legacy implementation has been moved to:
 * `apps/studio/app/studio/legacy/StudioCanvas.tsx`
 */

export default function StudioCanvas() {
  return (
    <div className="p-6 rounded-xl border border-black/10 bg-white/60 backdrop-blur">
      <div className="text-sm font-medium">StudioCanvas (legacy) has been deprecated.</div>
      <div className="mt-2 text-xs opacity-70">
        Use <code className="px-1 py-0.5 rounded bg-black/5">studio/editor-core</code> instead (Designer tab in GardenApp).
      </div>
    </div>
  );
}
