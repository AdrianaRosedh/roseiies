import type { GardenPlanting } from "@/lib/garden/load-plantings";

export type Item = {
  id: string;
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

export type Role = "guest" | "gardener" | "kitchen";

export type RoleCard = {
  title: string;
  subtitle: string;
  body: string;
};

export type PlantingsByBed = Map<string, GardenPlanting[]>;
