import type { Column } from "./types";

export function lsColsKey(tenantId: string) {
  return `roseiies:garden:sheets:cols:${tenantId}`;
}

export function lsCellsKey(tenantId: string, gardenName: string) {
  return `roseiies:garden:sheets:cells:${tenantId}:${gardenName}`;
}

export function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return (JSON.parse(raw) as T) ?? fallback;
  } catch {
    return fallback;
  }
}

export function readColsFromLS(tenantId: string, fallback: Column[]) {
  try {
    const parsed = safeJsonParse<any>(localStorage.getItem(lsColsKey(tenantId)), null);
    if (Array.isArray(parsed) && parsed.length) return parsed as Column[];
  } catch {}
  return fallback;
}

export function writeColsToLS(tenantId: string, cols: Column[]) {
  try {
    localStorage.setItem(lsColsKey(tenantId), JSON.stringify(cols));
  } catch {}
}

export function readCellsFromLS(tenantId: string, gardenName: string) {
  try {
    return safeJsonParse<Record<string, Record<string, any>>>(
      localStorage.getItem(lsCellsKey(tenantId, gardenName)),
      {}
    );
  } catch {
    return {};
  }
}

export function writeCellsToLS(
  tenantId: string,
  gardenName: string,
  cells: Record<string, Record<string, any>>
) {
  try {
    localStorage.setItem(lsCellsKey(tenantId, gardenName), JSON.stringify(cells));
  } catch {}
}