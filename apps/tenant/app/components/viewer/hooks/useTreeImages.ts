"use client";

import { useEffect, useState } from "react";

const TREE_VARIANTS = ["tree-01", "tree-02", "tree-03", "tree-04", "citrus"] as const;
export type TreeVariant = (typeof TREE_VARIANTS)[number];

export function useTreeImages() {
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
    })().catch((e) => {
      console.warn("[tenant] useTreeImages failed", e);
    });

    return () => {
      alive = false;
    };
  }, []);

  return treeImages;
}
