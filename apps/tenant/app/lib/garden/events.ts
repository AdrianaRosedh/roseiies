export type GardenEventType = "harvest" | "observation" | "planting";

export type GardenEvent = {
  id: string;
  createdAt: string; // ISO
  type: GardenEventType;
  bedId: string;
  note: string;
};

const STORAGE_KEY = "roseiies:gardenEvents:v1";

export function readEvents(): GardenEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as GardenEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeEvents(events: GardenEvent[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

export function addEvent(e: Omit<GardenEvent, "id" | "createdAt">): GardenEvent {
  const ev: GardenEvent = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...e,
  };

  const all = readEvents();
  all.unshift(ev);
  writeEvents(all);
  return ev;
}

export function eventsForBed(bedId: string): GardenEvent[] {
  return readEvents().filter((e) => e.bedId === bedId);
}

export function eventsThisWeek(): GardenEvent[] {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - 7);

  return readEvents().filter((e) => new Date(e.createdAt) >= start);
}