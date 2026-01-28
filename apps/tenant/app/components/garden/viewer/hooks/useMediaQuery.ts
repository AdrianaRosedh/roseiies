"use client";

import { useEffect, useState } from "react";

export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const m = window.matchMedia(query);

    const onChange = () => setMatches(m.matches);
    onChange();

    // Safari fallback
    if (typeof m.addEventListener === "function") {
      m.addEventListener("change", onChange);
      return () => m.removeEventListener("change", onChange);
    } else {
      m.addListener(onChange);
      return () => m.removeListener(onChange);
    }
  }, [query]);

  return matches;
}
