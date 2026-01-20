"use client";

import { useEffect, useRef, useState } from "react";
import type { PortalContext } from "../../../lib/portal/getPortalContext";

type AnyStore = any;

export function useAutoSaveDesigner({
  store,
  portal,
}: {
  store: AnyStore;
  portal: PortalContext;
}) {
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle"
  );

  const timerRef = useRef<number | null>(null);
  const inflightRef = useRef<Promise<void> | null>(null);
  const dirtyRef = useRef(false);

  function scheduleFlush() {
    dirtyRef.current = true;
    setStatus((s) => (s === "saving" ? "saving" : "idle"));

    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      void flush();
    }, 650);
  }

  async function flush() {
    if (!dirtyRef.current) return;
    if (inflightRef.current) return;

    // whatever you consider the "active doc/layout"
    const layoutId = store.state.activeLayoutId;
    const doc = layoutId ? store.state.docs?.[layoutId] : null;

    const gardenId = store.state.activeGardenId;
    if (!doc || !gardenId) return;

    setStatus("saving");

    inflightRef.current = (async () => {
      try {
        // IMPORTANT: send only what you need. For v1 you can send the full doc.
        const res = await fetch("/api/garden-layout", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tenant_id: portal.tenantId,
            garden_id: gardenId,
            layout_id: layoutId,
            doc, // v1: full doc. later: diff/ops
          }),
        });

        const text = await res.text();
        const data = text ? JSON.parse(text) : null;

        if (!res.ok) {
          console.error("autosave failed:", res.status, data);
          setStatus("error");
          return;
        }

        dirtyRef.current = false;
        setStatus("saved");
      } catch (e) {
        console.error("autosave exception:", e);
        setStatus("error");
      } finally {
        inflightRef.current = null;
      }
    })();

    await inflightRef.current;
  }

  // 1) Subscribe to store mutations
  useEffect(() => {
    // If your store has a subscription API, use it.
    // Example patterns: store.subscribe(listener) or store.on("change", fn)
    // If not, we can wrap the mutation functions instead.
    const unsub =
      typeof store.subscribe === "function"
        ? store.subscribe((event: any) => {
            // Only react to doc/layout changes (avoid noisy updates)
            if (
              event?.type?.includes?.("DOC_") ||
              event?.type?.includes?.("LAYOUT_") ||
              event?.type?.includes?.("BED_") ||
              event?.type?.includes?.("PIN_")
            ) {
              scheduleFlush();
            }
          })
        : null;

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      if (typeof unsub === "function") unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, portal.tenantId]);

  // 2) Flush when tab is hidden / leaving
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "hidden") void flush();
    };
    window.addEventListener("visibilitychange", onVis);
    window.addEventListener("beforeunload", onVis);
    return () => {
      window.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("beforeunload", onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { status, flush, scheduleFlush };
}
