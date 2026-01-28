function looksLikeCssColor(s: string) {
  const v = s.trim().toLowerCase();
  return v.startsWith("rgb(") || v.startsWith("rgba(") || v.startsWith("hsl(") || v.startsWith("hsla(") || v.startsWith("var(");
}

function hexToRgba(hex: string, opacity: number) {
  const h = String(hex ?? "#010506").replace("#", "").trim();
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b)) return `rgba(1,5,6,${opacity})`;
  return `rgba(${r},${g},${b},${opacity})`;
}

export function colorWithOpacity(input: any, opacity: number, fallbackHex: string) {
  const raw = String(input ?? "").trim();
  if (!raw) return hexToRgba(fallbackHex, opacity);
  if (looksLikeCssColor(raw)) return raw;
  if (raw.startsWith("#") || /^[0-9a-fA-F]{3,8}$/.test(raw)) {
    const hex = raw.startsWith("#") ? raw : `#${raw}`;
    return hexToRgba(hex, opacity);
  }
  return hexToRgba(fallbackHex, opacity);
}
