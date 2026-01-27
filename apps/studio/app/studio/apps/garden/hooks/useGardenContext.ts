// apps/studio/app/studio/apps/garden/hooks/useGardenContext.ts
"use client";

import { useCallback, useRef } from "react";

export type GardenContext = {
  workplaceId: string;
  areaId: string;
  layoutId: string;
  workplaceSlug: string;
  areaName: string;
};

async function fetchGardenContext(areaName: string) {
  const res = await fetch(
    `/api/garden-context?workplaceSlug=olivea&areaName=${encodeURIComponent(areaName)}`,
    { cache: "no-store" }
  );
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(json?.error ?? text ?? `garden-context failed (${res.status})`);
  return json as GardenContext;
}

function safeAreaName(raw: string | null) {
  const s = String(raw ?? "").trim();
  return s.length ? s : "Garden";
}

export function useGardenContext(args: { areaName: string | null }) {
  const areaName = safeAreaName(args.areaName);

  const ctxRef = useRef<{ key: string; ctx: GardenContext } | null>(null);

  const getCtx = useCallback(async () => {
    const cached = ctxRef.current;
    if (cached && cached.key === areaName) return cached.ctx;
    const ctx = await fetchGardenContext(areaName);
    ctxRef.current = { key: areaName, ctx };
    return ctx;
  }, [areaName]);

  return { areaName, getCtx };
}
