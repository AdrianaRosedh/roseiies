// apps/studio/app/studio/editor-core/hooks/usePlantingsRealtime.ts
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { LayoutDoc } from "../types";
import { createBrowserSupabase } from "@roseiies/supabase/browser";

export type PlantingRow = {
  id: string;
  bed_id: string | null;
  zone_code: string | null;
  crop: string | null;
  status: string | null;
  planted_at: string | null;
  pin_x: number | null;
  pin_y: number | null;
  created_at?: string | null;
};

function sanitizePlantingsForDoc(doc: LayoutDoc, plantings: PlantingRow[]) {
  const items = doc?.items ?? [];
  const beds = items.filter((it: any) => it.type === "bed");
  const validItemIds = new Set(items.map((it: any) => it.id));

  const zonesForBed = (bedId: string) => {
    const bed = beds.find((b: any) => b.id === bedId);
    const zones = bed?.meta?.zones;
    if (!Array.isArray(zones)) return [];
    return zones.map((z: any) => String(z?.code ?? "").trim()).filter(Boolean);
  };

  return (plantings ?? [])
    .filter((p) => p && p.bed_id && validItemIds.has(p.bed_id))
    .map((p) => {
      const bedId = p.bed_id as string;
      const allowed = zonesForBed(bedId);
      const z = p.zone_code ? String(p.zone_code).trim() : null;
      const zone_code = z && allowed.includes(z) ? z : null;
      return { ...p, zone_code };
    });
}

export function usePlantingsRealtime(args: {
  tenantId: string | null;
  gardenName: string | null;
  doc: LayoutDoc;
}) {
  const { tenantId, gardenName, doc } = args;

  const [gardenId, setGardenId] = useState<string | null>(null);
  const mapRef = useRef<Map<string, PlantingRow>>(new Map());
  const [version, setVersion] = useState(0);

  // ---------------------------------------------------------------------------
  // Initial load (and whenever garden changes)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let alive = true;

    async function load() {
      mapRef.current = new Map();
      setVersion((v) => v + 1);
      setGardenId(null);

      if (!gardenName) return;

      try {
        const res = await fetch(`/api/plantings?gardenName=${encodeURIComponent(gardenName)}`);
        const text = await res.text();
        const json = text ? JSON.parse(text) : null;
        if (!res.ok) return;

        const nextGardenId = (json?.gardenId as string | null) ?? null;
        const rows = (Array.isArray(json?.rows) ? (json.rows as PlantingRow[]) : []) ?? [];

        if (!alive) return;

        setGardenId(nextGardenId);

        const m = new Map<string, PlantingRow>();
        for (const r of rows) m.set(r.id, r);
        mapRef.current = m;
        setVersion((v) => v + 1);
      } catch {
        // ignore
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [gardenName]);

  // ---------------------------------------------------------------------------
  // Realtime incremental updates (tenant + garden scoped)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!tenantId) return;
    if (!gardenId) return;

    const supabase = createBrowserSupabase();

    const channel = supabase
      .channel(`garden_plantings:${tenantId}:${gardenId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "garden_plantings",
          // ✅ scoped: tenant + garden (no global spam)
          filter: `tenant_id=eq.${tenantId},garden_id=eq.${gardenId}`,
        },
        (payload: any) => {
          const event = String(payload?.eventType ?? "").toUpperCase();
          const rowNew = payload?.new as PlantingRow | undefined;
          const rowOld = payload?.old as PlantingRow | undefined;

          const m = mapRef.current;

          if (event === "INSERT" && rowNew?.id) {
            m.set(rowNew.id, rowNew);
            setVersion((v) => v + 1);
            return;
          }

          if (event === "UPDATE" && rowNew?.id) {
            m.set(rowNew.id, rowNew);
            setVersion((v) => v + 1);
            return;
          }

          if (event === "DELETE" && rowOld?.id) {
            m.delete(rowOld.id);
            setVersion((v) => v + 1);
            return;
          }

          // fallback safety (rare payload shapes)
          setVersion((v) => v + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, gardenId]);

  // ---------------------------------------------------------------------------
  // Output: stable array + sanitized for current doc
  // ---------------------------------------------------------------------------
  const rowsRaw = useMemo(() => {
    // version is the “signal” that map changed
    void version;
    return Array.from(mapRef.current.values());
  }, [version]);

  const rows = useMemo(() => sanitizePlantingsForDoc(doc, rowsRaw), [doc, rowsRaw]);

  return { gardenId, rows };
}