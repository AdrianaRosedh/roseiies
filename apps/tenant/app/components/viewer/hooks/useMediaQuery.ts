"use client";

import { useEffect, useState } from "react";

export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const m = window.matchMedia(query);
    const onChange = () => setMatches(m.matches);

    // sync once
    onChange();

    if (typeof m.addEventListener === "function") {
      m.addEventListener("change", onChange);
      return () => m.removeEventListener("change", onChange);
    } else {
      // Safari fallback
      m.addListener(onChange);
      return () => m.removeListener(onChange);
    }
  }, [query]);

  return matches;
}
