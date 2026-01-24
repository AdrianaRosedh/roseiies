// apps/studio/app/studio/apps/garden/sheets/grid/store.ts
"use client";

export type GridCellId = { rowId: string; colKey: string };

type EditingState = {
  cell: GridCellId;
  value: any;
  // used to position overlay
  anchorRect: DOMRect | null;
};

type GridState = {
  selected: GridCellId | null;
  editing: EditingState | null;
  // a “grid has focus” flag so keyboard navigation works like Airtable
  isActive: boolean;
};

type Listener = () => void;

export function createGridStore(initial?: Partial<GridState>) {
  let state: GridState = {
    selected: null,
    editing: null,
    isActive: false,
    ...initial,
  };

  const listeners = new Set<Listener>();

  const api = {
    getState: () => state,
    setState: (patch: Partial<GridState>) => {
      state = { ...state, ...patch };
      listeners.forEach((l) => l());
    },
    subscribe: (listener: Listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    // helpers
    setActive: (v: boolean) => api.setState({ isActive: v }),
    select: (cell: GridCellId | null) => api.setState({ selected: cell }),
    beginEdit: (cell: GridCellId, value: any, anchorRect: DOMRect | null) =>
      api.setState({ selected: cell, editing: { cell, value, anchorRect } }),
    updateDraft: (value: any) => {
      const ed = state.editing;
      if (!ed) return;
      api.setState({ editing: { ...ed, value } });
    },
    setAnchorRect: (rect: DOMRect | null) => {
      const ed = state.editing;
      if (!ed) return;
      api.setState({ editing: { ...ed, anchorRect: rect } });
    },
    endEdit: () => api.setState({ editing: null }),
  };

  return api;
}

export type GridStore = ReturnType<typeof createGridStore>;
