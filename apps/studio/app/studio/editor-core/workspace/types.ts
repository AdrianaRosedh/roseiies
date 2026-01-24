// apps/studio/app/studio/editor-core/workspace/types.ts

import type {
  LayoutDoc,
  StudioItem,
  ItemType,
  StudioModule,
  WorkspaceStore,
  PlantBlock,
} from "../types";
import type { PublishResult } from "../TopBar";

export type WorkspaceUIState = {
  tool: ItemType;
  selectedIds: string[];
  stageScale: number;
  stagePos: { x: number; y: number };
  panMode: boolean;

  treeVariant: string;

  // bump when selection geometry should refresh (konva transformer)
  selectionVersion: number;
};

export type WorkspaceCommandsDeps = {
  module: StudioModule;
  state: WorkspaceStore;
  setState: React.Dispatch<React.SetStateAction<WorkspaceStore>>;

  doc: LayoutDoc;

  ui: WorkspaceUIState;
  setUI: React.Dispatch<React.SetStateAction<WorkspaceUIState>>;

  // doc update primitive (should create history snapshot before patching)
  updateDoc: (patch: Partial<LayoutDoc>) => void;

  // item update primitive (batch)
  updateItemsBatch: (patches: Array<{ id: string; patch: Partial<StudioItem> }>) => void;

  // selection helpers
  setSelectedIds: (ids: string[]) => void;
};

export type WorkspaceCommands = {
  // layout/garden
  setActiveGarden: (gardenId: string) => void;
  setActiveLayout: (layoutId: string) => void;
  newGarden: (name: string) => void;
  renameGarden: (name: string) => void;
  newLayout: (name: string) => void;
  renameLayout: (name: string) => void;
  publishLayout: (tenantId?: string) => Promise<PublishResult>;

  // view
  resetView: () => void;

  // items
  addItemAtWorld: (args: { type: ItemType; x: number; y: number }) => void;
  deleteSelected: () => void;

  // bed plants (existing internal bed “plant blocks” tooling)
  addPlantToBed: (bedId: string) => void;
  updatePlant: (bedId: string, plantId: string, patch: Partial<PlantBlock>) => void;
  removePlant: (bedId: string, plantId: string) => void;
};
