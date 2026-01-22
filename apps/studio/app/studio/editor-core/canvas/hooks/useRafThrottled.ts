// apps/studio/app/studio/editor-core/canvas/hooks/useRafThrottled.ts
"use client";

import { useCallback, useEffect, useRef } from "react";

export function useRafThrottled<T extends (...args: any[]) => void>(fn: T) {
  const raf = useRef<number | null>(null);
  const lastArgs = useRef<any[] | null>(null);
  const fnRef = useRef(fn);

  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  return useCallback((...args: Parameters<T>) => {
    lastArgs.current = args;
    if (raf.current != null) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = null;
      if (lastArgs.current) fnRef.current(...(lastArgs.current as any[]));
    });
  }, []) as T;
}
