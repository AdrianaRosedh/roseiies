// apps/studio/app/studio/editor-core/canvas/hooks/useTreeImages.ts
"use client";

import { useEffect, useState } from "react";

const TREE_VARIANTS = ["tree-01", "tree-02", "tree-03", "tree-04", "citrus"] as const;

export default function useTreeImages() {
  const [treeImages, setTreeImages] = useState<Record<string, HTMLImageElement>>({});

  useEffect(() => {
    let alive = true;

    (async () => {
      const entries = await Promise.all(
        TREE_VARIANTS.map(async (v) => {
          const img = new window.Image();
          img.decoding = "async";
          img.src = `/images/trees/${v}.svg`;

          await new Promise<void>((res, rej) => {
            img.onload = () => res();
            img.onerror = () => rej(new Error(`Failed to load tree svg: ${v}`));
          });

          return [v, img] as const;
        })
      );

      if (!alive) return;
      setTreeImages(Object.fromEntries(entries));
    })().catch(() => {
      // ignore
    });

    return () => {
      alive = false;
    };
  }, []);

  return treeImages;
}
