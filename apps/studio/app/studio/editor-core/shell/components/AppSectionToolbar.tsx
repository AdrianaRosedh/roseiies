"use client";

import React, { useEffect, useRef, useState } from "react";
import { tbBtn } from "./toolbarStyles";

export type ToolbarAction =
  | {
      kind: "button";
      label: string;
      onClick: () => void;
      tone?: "ghost" | "primary" | "danger";
      disabled?: boolean;
      title?: string;
    }
  | { kind: "separator" }
  | { kind: "text"; value: string; tone?: "muted" | "danger"; title?: string }
  | { kind: "node"; node: React.ReactNode };

function useStableFlag(
  on: boolean,
  opts?: { showDelayMs?: number; minShowMs?: number }
) {
  const showDelayMs = opts?.showDelayMs ?? 180;
  const minShowMs = opts?.minShowMs ?? 520;

  const [visible, setVisible] = useState(false);

  const showTimer = useRef<any>(null);
  const hideTimer = useRef<any>(null);
  const shownAt = useRef<number | null>(null);

  useEffect(() => {
    const clear = () => {
      if (showTimer.current) clearTimeout(showTimer.current);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      showTimer.current = null;
      hideTimer.current = null;
    };

    clear();

    if (on) {
      // don’t show immediately → avoids flicker
      showTimer.current = setTimeout(() => {
        setVisible(true);
        shownAt.current = Date.now();
      }, showDelayMs);

      return clear;
    }

    // turning off
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
  }, [on, visible, showDelayMs, minShowMs]);

  return visible;
}

export default function AppSectionToolbar(props: {
  actions: ToolbarAction[];

  /**
   * Optional shared status slot (recommended).
   * This keeps “Updating…” stable and non-glitchy across all sections.
   */
  status?: {
    loading?: boolean;
    loadingText?: string; // default: "Updating…"
    error?: string | null;
  };

  /**
   * Tuning for stable loading indicator (optional).
   */
  statusBehavior?: {
    showDelayMs?: number;
    minShowMs?: number;
  };
}) {
  const stableLoading = useStableFlag(Boolean(props.status?.loading), props.statusBehavior);
  const loadingText = props.status?.loadingText ?? "Updating…";
  const errorText = props.status?.error ?? null;

  return (
    <div className="flex items-center gap-2 min-w-0">
      {/* Actions */}
      {props.actions.map((a, i) => {
        if (a.kind === "separator") {
          return <span key={i} className="mx-1 h-5 w-px bg-black/10" />;
        }

        if (a.kind === "node") {
          return <React.Fragment key={i}>{a.node}</React.Fragment>;
        }

        if (a.kind === "text") {
          return (
            <span
              key={i}
              className={[
                "text-xs truncate max-w-60",
                a.tone === "danger" ? "text-red-700/70" : "text-black/40",
              ].join(" ")}
              title={a.title ?? a.value}
            >
              {a.value}
            </span>
          );
        }

        const tone = a.tone ?? "ghost";
        return (
          <button
            key={i}
            type="button"
            className={tbBtn(tone)}
            onClick={a.onClick}
            disabled={a.disabled}
            title={a.title}
          >
            {a.label}
          </button>
        );
      })}

      {/* Shared Status (stable + non-jitter) */}
      {props.status ? (
        <>
          {stableLoading ? (
            <span className="text-xs text-black/40 truncate max-w-60" title={loadingText}>
              {loadingText}
            </span>
          ) : null}

          {errorText ? (
            <span className="text-xs text-red-700/70 truncate max-w-60" title={errorText}>
              {errorText}
            </span>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
