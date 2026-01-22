// apps/studio/app/studio/editor-core/canvas/types.ts
export type EditMode = "none" | "corners" | "polygon" | "curvature" | "bezier";

export type ScreenBox =
  | { left: number; top: number; width: number; height: number }
  | null;
