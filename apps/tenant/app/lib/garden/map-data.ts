export type BedStatus = "abundant" | "fragile" | "dormant";

export type GardenBed = {
  id: string;
  name: string;
  points: string;
  status?: BedStatus;
  published: boolean;
  publicHighlight?: string | null;
};

export type GardenMapData = {
  viewBox: string;
  beds: GardenBed[];
};

export const OLIVEA_GARDEN_MAP_V1: GardenMapData = {
  viewBox: "0 0 1000 600",
  beds: [
    {
      id: "bed-01",
      name: "Bed 01",
      points: "90,120 330,110 360,220 110,240",
      status: "abundant",
      published: true,
      publicHighlight: "Picked today: heirloom tomato"
    },
    {
      id: "bed-02",
      name: "Bed 02",
      points: "390,120 650,120 670,230 410,240",
      status: "fragile",
      published: true,
      publicHighlight: "In transition: winter greens"
    },
    {
      id: "bed-03",
      name: "Bed 03",
      points: "140,280 640,280 620,400 160,400",
      status: "dormant",
      published: false,
      publicHighlight: null
    }
  ]
};