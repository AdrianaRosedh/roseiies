"use client";

import { useEffect, useRef, useState } from "react";

export function useResizeObserver<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setSize({ width: Math.round(r.width), height: Math.round(r.height) });
    });

    ro.observe(el);

    const r = el.getBoundingClientRect();
    setSize({ width: Math.round(r.width), height: Math.round(r.height) });

    return () => ro.disconnect();
  }, []);

  return { ref, size };
}
