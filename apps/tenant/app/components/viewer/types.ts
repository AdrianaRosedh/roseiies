// apps/tenant/app/components/viewer/types.ts
import type { ViewerItem } from "@/types/view";

export type Role = "guest" | "team";

export type PlantingPin = {
  id: string;
  bedCanvasId: string;
  plantingId: string;
  x: number;
  y: number;
  label: string;
};

export type Item = ViewerItem;
