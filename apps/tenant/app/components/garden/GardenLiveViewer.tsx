// apps/tenant/app/components/garden/GardenLiveViewer.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import GardenViewer from "./GardenViewer";

type ViewerContext = {
  enabled: boolean;
  areaId: string;
  layoutId: string;
  revision: string;
};

type ViewerData = {
  canvas: { width: number; height: number };
  items: any[];
  plantings: any[];
};

function normalizeData(json: any): ViewerData {
  return {
    canvas:
      json?.canvas && typeof json.canvas === "object"
        ? json.canvas
        : { width: 1500, height: 1700 },
    items: Array.isArray(json?.items) ? json.items : [],
    plantings: Array.isArray(json?.plantings) ? json.plantings : [],
  };
}

export default function GardenLiveViewer(props: {
  workplaceSlug?: string;
  areaName?: string;
}) {
  const workplaceSlug = props.workplaceSlug ?? "olivea";
  const areaName = props.areaName ?? "Garden";

  const [ctx, setCtx] = useState<ViewerContext | null>(null);
  const [data, setData] = useState<ViewerData | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const lastRevRef = useRef<string | null>(null);
  const inflightRef = useRef<AbortController | null>(null);

  async function loadAll(nextCtx?: ViewerContext) {
    const c = nextCtx ?? ctx;
    if (!c?.layoutId || !c?.areaId) return;

    inflightRef.current?.abort();
    const ac = new AbortController();
    inflightRef.current = ac;

    const res = await fetch(
      `/api/garden-viewer-data?layoutId=${encodeURIComponent(c.layoutId)}&areaId=${encodeURIComponent(
        c.areaId
      )}`,
      { cache: "no-store", signal: ac.signal }
    );

    const text = await res.text();
    const json = text ? JSON.parse(text) : {};
    if (!res.ok) throw new Error(json?.error ?? text ?? `viewer-data failed (${res.status})`);

    setData(normalizeData(json));
  }

  async function refreshContext() {
    const res = await fetch(
      `/api/garden-viewer-context?workplaceSlug=${encodeURIComponent(
        workplaceSlug
      )}&areaName=${encodeURIComponent(areaName)}`,
      { cache: "no-store" }
    );

    const text = await res.text();
    const json = text ? JSON.parse(text) : {};
    if (!res.ok) throw new Error(json?.error ?? text ?? `viewer-context failed (${res.status})`);
    return json as ViewerContext;
  }

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setErr(null);
        const nextCtx = await refreshContext();
        if (!alive) return;

        setCtx(nextCtx);
        lastRevRef.current = nextCtx.revision;

        await loadAll(nextCtx);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message ?? "Failed to load garden viewer");
      }
    })();

    return () => {
      alive = false;
      inflightRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ctx) return;

    let alive = true;
    const t = setInterval(async () => {
      try {
        const nextCtx = await refreshContext();
        if (!alive) return;

        setCtx(nextCtx);

        const prev = lastRevRef.current;
        if (prev !== nextCtx.revision) {
          lastRevRef.current = nextCtx.revision;
          await loadAll(nextCtx);
        }
      } catch {
        // ignore poll errors
      }
    }, 3000);

    return () => {
      alive = false;
      clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx?.areaId, ctx?.layoutId]);

  if (err) {
    return (
      <div className="rounded-2xl border border-(--rose-border) bg-(--rose-surface) backdrop-blur shadow-sm p-6 text-sm text-(--rose-muted)">
        {err}
      </div>
    );
  }

  if (!ctx || !data) {
    return (
      <div className="rounded-2xl border border-(--rose-border) bg-(--rose-surface) backdrop-blur shadow-sm p-6 text-sm text-(--rose-muted)">
        Loading garden…
      </div>
    );
  }

  return <GardenViewer canvas={data.canvas} items={data.items} plantings={data.plantings} role="guest" />;
}
