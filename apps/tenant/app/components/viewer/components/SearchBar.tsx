"use client";

import React, { useMemo, useState } from "react";

export default function SearchBar(props: {
  value: string;
  onChange: (v: string) => void;
  onFocus?: () => void;
  placeholder?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;

  // ✅ new
  variant?: "default" | "header";
}) {
  const variant = props.variant ?? "default";

  const BORDER = "rgba(15, 23, 42, 0.12)";
  const INK = "rgba(15, 23, 42, 0.92)";
  const MUTED = "rgba(15, 23, 42, 0.55)";
  const SURFACE = "rgba(255,255,255,0.92)";
  const ACCENT = "rgba(251,113,133,0.55)";

  const [focused, setFocused] = useState(false);

  const ring = useMemo(() => {
    if (!focused) return "none";
    return `0 0 0 3px ${ACCENT}`;
  }, [focused]);

  const height = variant === "header" ? 44 : 52;

  return (
    <div style={{ width: "100%" }}>
      <div
        style={{
          height,
          borderRadius: 20,
          border: `1px solid ${BORDER}`,
          background: SURFACE,
          padding: "0 12px",
          boxShadow: `0 10px 26px rgba(0,0,0,0.08), ${ring}`,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="11" cy="11" r="6.5" stroke={MUTED} strokeWidth="1.8" />
          <path d="M20 20l-3.8-3.8" stroke={MUTED} strokeWidth="1.8" />
        </svg>

        <input
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          onFocus={() => {
            setFocused(true);
            props.onFocus?.();
          }}
          onBlur={() => setFocused(false)}
          onKeyDown={props.onKeyDown}
          placeholder={props.placeholder ?? "Search…"}
          style={{
            width: "100%",
            background: "transparent",
            outline: "none",
            border: "none",
            color: INK,
            fontSize: 16,
            fontWeight: 600,
          }}
        />

        {props.value ? (
          <button
            type="button"
            onClick={() => props.onChange("")}
            aria-label="Clear search"
            style={{
              border: `1px solid ${BORDER}`,
              background: "rgba(15,23,42,0.06)",
              color: MUTED,
              borderRadius: 999,
              width: 30,
              height: 30,
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
              flex: "0 0 auto",
            }}
          >
            ✕
          </button>
        ) : null}
      </div>

      {variant === "default" ? (
        <div style={{ fontSize: 12, color: MUTED, marginTop: 10 }}>
          Tip: search crops, beds, notes.
        </div>
      ) : null}
    </div>
  );
}
