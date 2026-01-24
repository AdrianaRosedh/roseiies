// apps/studio/app/studio/apps/garden/sheets/types.ts

export type PlantingRow = {
  id: string;
  bed_id: string | null;      // bed OR tree item id
  zone_code: string | null;   // zone code inside the bed
  crop: string | null;
  status: string | null;
  planted_at: string | null;  // yyyy-mm-dd
  pin_x: number | null;       // 0..1
  pin_y: number | null;       // 0..1
};

export type ColType = "text" | "number" | "select" | "date" | "checkbox";

export type Column = {
  key: keyof PlantingRow | string;
  label: string;
  type: ColType;
  width?: number;
  options?: { values: string[] };
};

export function isCoreKey(k: string): k is keyof PlantingRow {
  return (
    k === "id" ||
    k === "bed_id" ||
    k === "zone_code" ||
    k === "crop" ||
    k === "status" ||
    k === "planted_at" ||
    k === "pin_x" ||
    k === "pin_y"
  );
}

export function emptyDraftRow(): Omit<PlantingRow, "id"> {
  return {
    bed_id: null,
    zone_code: null,
    crop: null,
    status: null,
    planted_at: null,
    pin_x: null,
    pin_y: null,
  };
}

export function coerceByType(col: Column, value: any) {
  if (col.type === "number") {
    if (value === "" || value == null) return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  if (col.type === "checkbox") return Boolean(value);
  if (col.type === "date") return value === "" ? null : String(value);
  if (col.type === "select") return value === "" ? null : String(value);
  return value === "" ? null : String(value);
}

export function pillClass(value: string) {
  const palettes = [
    "bg-emerald-100 text-emerald-900 ring-emerald-200",
    "bg-sky-100 text-sky-900 ring-sky-200",
    "bg-rose-100 text-rose-900 ring-rose-200",
    "bg-amber-100 text-amber-900 ring-amber-200",
    "bg-violet-100 text-violet-900 ring-violet-200",
    "bg-lime-100 text-lime-900 ring-lime-200",
  ];
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) >>> 0;
  const pick = palettes[h % palettes.length];
  return `inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${pick}`;
}
