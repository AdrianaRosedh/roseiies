export function pickLang(
  text: Record<string, string> | undefined,
  lang: string,
  fallback = "en"
) {
  if (!text) return "";
  return text[lang] ?? text[fallback] ?? Object.values(text)[0] ?? "";
}
