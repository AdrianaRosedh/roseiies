"use client";

import { useEffect, useState } from "react";

export function useResizeObserver<T extends HTMLElement>() {
  const [node, setNode] = useState<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!node) return;

    const measure = () => {
      const r = node.getBoundingClientRect();
      const w = Math.round(r.width);
      const h = Math.round(r.height);
      if (w > 0 && h > 0) setSize({ width: w, height: h });
    };

    // Measure immediately (critical for first paint)
    measure();

    // ResizeObserver for ongoing changes
    const ro = new ResizeObserver(() => measure());
    ro.observe(node);

    // Fallback: window resize (sometimes RO is delayed on iOS / emulation)
    window.addEventListener("resize", measure);

    // Also try one more time next frame (helps when layout settles after mount)
    const raf = requestAnimationFrame(measure);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
      ro.disconnect();
    };
  }, [node]);

  return { ref: setNode, size };
}
