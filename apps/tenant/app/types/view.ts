// apps/tenant/app/types/view.ts
export type ViewCanvas = { width: number; height: number };

export type ViewLayoutMeta = {
  id: string;
  name: string;
  canvas: ViewCanvas;

  workplace_id: string;
  area_id: string;

  workplace_name: string | null;
  workplace_slug: string | null;

  area_name: string | null;
  area_kind: string | null;
};

export type ViewerItem = {
  id: string; // canvas id
  type: string;

  x: number;
  y: number;
  w: number;
  h: number;
  r: number;
  order: number;

  label: string;
  meta: any;
  style: any;
};

export type ViewPayload = {
  layout: ViewLayoutMeta;
  items: ViewerItem[];
};
