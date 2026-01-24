// apps/studio/app/studio/editor-core/workspace/utils/doc.ts

import type { LayoutDoc, StudioModule } from "../../types";

export function emptyDoc(module: StudioModule): LayoutDoc {
  return { version: 1, canvas: module.defaults.canvas, items: [] };
}

// structuredClone keeps types better; fallback to JSON.
export function cloneDoc(doc: LayoutDoc): LayoutDoc {
  // @ts-ignore
  if (typeof structuredClone === "function") return structuredClone(doc);
  return JSON.parse(JSON.stringify(doc)) as LayoutDoc;
}
