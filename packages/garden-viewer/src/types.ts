export type GardenViewerRole = "guest" | "gardener" | "kitchen";

export type GardenViewerItem = {
  id: string;          // canvas item id
  type: string;        // bed | tree | structure | path | label | zone | etc
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

export type GardenViewerPlanting = {
  id: string;
  bed_id: string;
  zone_code: string | null;

  crop: string;
  status: string | null;
  planted_at: string | null;

  pin_x: number | null;
  pin_y: number | null;

  guest_story: string | null;
  guest_facts: any | null;
  gardener_notes: string | null;
  kitchen_notes: string | null;
};
