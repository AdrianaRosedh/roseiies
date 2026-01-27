"use client";

import { useCallback, useMemo, useRef } from "react";

export type GardenContext = {
  workplaceId: string;
  areaId: string;
  layoutId: string;
  workplaceSlug: string;
  areaName: string;
};

async function fetchGardenContext(args: { areaName: string; layoutId?: string | null }) {
  const qs = new URLSearchParams();
  qs.set("workplaceSlug", "olivea");
  qs.set("areaName", args.areaName);
  if (args.layoutId) qs.set("layoutId", args.layoutId);

  const res = await fetch(`/api/garden-context?${qs.toString()}`, { cache: "no-store" });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(json?.error ?? text ?? `garden-context failed (${res.status})`);
  return json as GardenContext;
}

function safeAreaName(raw: string | null) {
  const s = String(raw ?? "").trim();
  return s.length ? s : "Garden";
}

export function useGardenContext(args: { areaName: string | null; layoutId?: string | null }) {
  const areaName = useMemo(() => safeAreaName(args.areaName), [args.areaName]);
  const layoutId = args.layoutId ?? null;

  const ctxRef = useRef<{ key: string; ctx: GardenContext } | null>(null);

  const getCtx = useCallback(async () => {
    const key = `${areaName}::${layoutId ?? ""}`;
    const cached = ctxRef.current;
    if (cached && cached.key === key) return cached.ctx;

    const ctx = await fetchGardenContext({ areaName, layoutId });
    ctxRef.current = { key, ctx };
    return ctx;
  }, [areaName, layoutId]);

  return { areaName, getCtx };
}
