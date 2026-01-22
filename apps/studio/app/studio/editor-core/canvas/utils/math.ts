// apps/studio/app/studio/editor-core/canvas/utils/math.ts
export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function rgba(hex: string, opacity: number) {
  const h = hex.replace("#", "").trim();
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}

export function uid(prefix = "p") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

export function mod(n: number, m: number) {
  return ((n % m) + m) % m;
}
