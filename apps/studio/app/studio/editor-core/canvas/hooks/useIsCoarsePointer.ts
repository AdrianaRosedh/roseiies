// apps/studio/app/studio/editor-core/canvas/hooks/useIsCoarsePointer.ts
"use client";

import { useEffect, useState } from "react";

export default function useIsCoarsePointer() {
  const [isCoarse, setIsCoarse] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const mq = window.matchMedia("(pointer: coarse)");
    const update = () => setIsCoarse(Boolean(mq.matches));

    update();
    if ("addEventListener" in mq) mq.addEventListener("change", update);
    else (mq as any).addListener(update);

    return () => {
      if ("removeEventListener" in mq) mq.removeEventListener("change", update);
      else (mq as any).removeListener(update);
    };
  }, []);

  return isCoarse;
}
