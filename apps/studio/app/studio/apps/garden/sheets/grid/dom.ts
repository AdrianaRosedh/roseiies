// apps/studio/app/studio/apps/garden/sheets/grid/dom.ts
"use client";

export function isEditableTarget(t: EventTarget | null) {
  const el = t as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName?.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  if ((el as any).isContentEditable) return true;
  return false;
}

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}