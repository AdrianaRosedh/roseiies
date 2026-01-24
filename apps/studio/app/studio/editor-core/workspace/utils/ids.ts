// apps/studio/app/studio/editor-core/workspace/utils/ids.ts

export function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}
