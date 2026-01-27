"use client";

import { useEffect, useRef, useState } from "react";

export function useStableLoading(
  loading: boolean,
  opts?: { showDelayMs?: number; minShowMs?: number }
) {
  const showDelayMs = opts?.showDelayMs ?? 180;
  const minShowMs = opts?.minShowMs ?? 520;

  const [visible, setVisible] = useState(false);

  const showTimer = useRef<any>(null);
  const hideTimer = useRef<any>(null);
  const shownAt = useRef<number | null>(null);

  useEffect(() => {
    // cleanup timers
    const clear = () => {
      if (showTimer.current) clearTimeout(showTimer.current);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      showTimer.current = null;
      hideTimer.current = null;
    };

    clear();

    if (loading) {
      // don’t show immediately → avoid flicker
      showTimer.current = setTimeout(() => {
        setVisible(true);
        shownAt.current = Date.now();
      }, showDelayMs);
      return clear;
    }

    // loading ended
    if (!visible) {
      shownAt.current = null;
      return clear;
    }

    const elapsed = shownAt.current ? Date.now() - shownAt.current : minShowMs;
    const remaining = Math.max(0, minShowMs - elapsed);

    hideTimer.current = setTimeout(() => {
      setVisible(false);
      shownAt.current = null;
    }, remaining);

    return clear;
  }, [loading, visible, showDelayMs, minShowMs]);

  return visible;
}
