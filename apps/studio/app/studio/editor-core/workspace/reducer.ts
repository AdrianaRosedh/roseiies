// apps/studio/app/studio/editor-core/workspace/reducer.ts

import type { LayoutDoc, WorkspaceStore } from "../types";

/**
 * Minimal reducer scaffold.
 * We’ll migrate mutations into here gradually to keep behavior stable.
 */
export type WorkspaceAction =
  | { type: "SET_ACTIVE_GARDEN"; gardenId: string; layoutId: string | null }
  | { type: "SET_ACTIVE_LAYOUT"; layoutId: string | null }
  | { type: "PATCH_DOC"; layoutId: string; patch: Partial<LayoutDoc> }
  | { type: "PATCH_STORE"; patch: Partial<WorkspaceStore> };

export function workspaceReducer(state: WorkspaceStore, action: WorkspaceAction): WorkspaceStore {
  switch (action.type) {
    case "SET_ACTIVE_GARDEN": {
      return {
        ...state,
        activeGardenId: action.gardenId,
        activeLayoutId: action.layoutId,
      };
    }

    case "SET_ACTIVE_LAYOUT": {
      return {
        ...state,
        activeLayoutId: action.layoutId,
      };
    }

    case "PATCH_DOC": {
      const prev = state.docs[action.layoutId];
      if (!prev) return state;

      return {
        ...state,
        docs: {
          ...state.docs,
          [action.layoutId]: {
            ...prev,
            ...action.patch,
          },
        },
      };
    }

    case "PATCH_STORE": {
      return { ...state, ...action.patch };
    }

    default:
      return state;
  }
}
