export type FeatureKind =
  | "planting"
  | "note"
  | "sensor"
  | "irrigation"
  | "event"
  | "custom";

export type MapFeature = {
  id: string;

  // DB asset id (must match item.meta.db_id)
  asset_id: string;

  kind: FeatureKind | string;

  title: string;
  subtitle?: string | null;

  // optional payload (domain-specific)
  meta?: any;
};

export type FeatureBundle = {
  features: MapFeature[];
};
