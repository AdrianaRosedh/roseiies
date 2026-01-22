// apps/studio/app/studio/editor-core/types.ts

export type ItemType = "bed" | "tree" | "zone" | "path" | "structure" | "label";

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

  // curvature for rounded rects (when NOT using a bezier path)
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

// ✅ Bezier path data (Illustrator-style)
// Coordinates are normalized 0..1 relative to the item box.
export type BezierHandle = { x: number; y: number }; // 0..1
export type BezierPoint = {
  id: string;
  x: number; // 0..1
  y: number; // 0..1
  in?: BezierHandle;
  out?: BezierHandle;
};

export type BezierPath = {
  closed: boolean;
  points: BezierPoint[];
};

// ✅ Per-corner radii for Live Corners
export type CornerRadii = { tl: number; tr: number; br: number; bl: number };

// ✅ Curvature tool (Illustrator-like): anchors only, auto-smooth
export type CurvaturePoint = {
  id: string;
  x: number; // 0..1
  y: number; // 0..1
  corner?: boolean; // true => corner, false/undefined => smooth
};

export type CurvaturePath = {
  closed: boolean;
  points: CurvaturePoint[];
  tension?: number; // 0..2 (default ~1)
};

// ✅ Polygon tool: straight-edge arbitrary shapes
export type PolygonPoint = {
  id: string;
  x: number; // 0..1
  y: number; // 0..1
};

export type PolygonPath = {
  closed: boolean;
  points: PolygonPoint[];
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

    // ✅ Advanced Bezier (Pen-tool style)
    bezier?: BezierPath;

    // ✅ Sleek Curvature (Illustrator Curvature tool style)
    curvature?: CurvaturePath;

    // ✅ Straight-edge arbitrary shape
    polygon?: PolygonPath;

    plants?: PlantBlock[];

    parentBedId?: string; // only for item.type === "zone"

    locked?: boolean;

    // ✅ Live Corners per-corner mode
    cornerRadii?: CornerRadii;

    // ✅ Trees
    tree?: {
      species?: string; // e.g. "Olivo", "Citrus"
      canopyM?: number; // optional (later mapping to pixels)
      note?: string;

      // SVG name WITHOUT extension, stored in public/images/trees/
      // e.g. "tree-01" or "citrus"
      variant?: string;
    };
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