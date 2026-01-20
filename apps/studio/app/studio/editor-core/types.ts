// apps/studio/app/studio/editor-core/types.ts

export type ItemType = "bed" | "zone" | "path" | "structure" | "label";

export type Swatch = { name: string; value: string };

export type ShadowStyle = {
  color: string;
  opacity: number; // 0..1
  blur: number;
  offsetX: number;
  offsetY: number;
};

export type ItemStyle = {
  fill: string;
  fillOpacity: number; // 0..1
  stroke: string;
  strokeOpacity: number; // 0..1
  strokeWidth: number;
  radius: number;
  shadow?: ShadowStyle;
};

export type PlantPin = {
  id: string;
  x: number; // 0..1 (relative to bed width)
  y: number; // 0..1 (relative to bed height)
  label?: string;
};

export type PlantBlock = {
  id: string;
  name: string;
  color: string;
  note?: string;
  pins?: PlantPin[];
};

export type StudioItem = {
  id: string;
  type: ItemType;
  x: number;
  y: number;
  w: number;
  h: number;
  r: number;
  order: number;
  label: string;

  meta: {
    status?: "abundant" | "fragile" | "dormant";
    public?: boolean;

    // Beds can show a “design intent” list, but operational truth comes later from plantings.
    plants?: PlantBlock[];

    // ✅ NEW: zones are nested “inside a bed” via parentBedId
    parentBedId?: string; // only for item.type === "zone"
  };

  style: ItemStyle;
};

export type LayoutDoc = {
  version: 1;
  canvas: { width: number; height: number };
  items: StudioItem[];
};

export type Garden = { id: string; name: string };

export type Layout = {
  id: string;
  gardenId: string;
  name: string;
  published: boolean;
  updatedAt: string;
};

export type WorkspaceStore = {
  version: 1;
  gardens: Garden[];
  layouts: Layout[];
  docs: Record<string, LayoutDoc>;
  activeGardenId: string | null;
  activeLayoutId: string | null;
};

export type ToolDef = { id: ItemType; label: string };

export type StudioModule = {
  id: string;
  title: string;
  subtitle?: string;
  swatches: Swatch[];
  tools: ToolDef[];
  defaults: {
    canvas: { width: number; height: number };
    stylesByType: Record<ItemType, ItemStyle>;
  };
};
