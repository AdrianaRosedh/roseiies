export type TenantId = string;

export type ViewMode = "guest" | "kitchen" | "ops" | "studio";

export type LocalizedText = Record<string, string>; // { "es": "...", "en": "..." }

export type BedShape =
  | { kind: "rect"; x: number; y: number; w: number; h: number; r?: number }
  | { kind: "poly"; points: number[] }; // [x1,y1,x2,y2...]

export type GardenBed = {
  id: string;
  tenantId: TenantId;
  slug: string;              // stable human id: "cama-01"
  label: LocalizedText;      // {es,en,...}
  shape: BedShape;
  status?: "active" | "inactive";
  updatedAt: string;
};

export type BedCard = {
  bedId: string;
  title: LocalizedText;
  story?: LocalizedText;
  images?: Array<{ url: string; alt?: LocalizedText }>;
  // later: plants, plantings, harvest windows, etc.
};
