"use client";

import React, { useEffect } from "react";

export default function BottomSheet(props: {
  open: boolean;
  snap: "collapsed" | "medium" | "large";
  onSnapChange: (s: "collapsed" | "medium" | "large") => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const snapPx = props.snap === "collapsed" ? 90 : props.snap === "medium" ? 320 : 520;

  // Escape collapses
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") props.onSnapChange("collapsed");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [props]);

  return (
    <div
      style={{
        position: "absolute",
        left: 12,
        right: 12,
        bottom: 12,
        height: snapPx,
        borderRadius: 22,
        border: "1px solid var(--border)",
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(14px)",
        zIndex: 80,
        overflow: "hidden",
      }}
    >
      <div style={{ padding: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 650 }}>{props.title}</div>
          {props.subtitle ? (
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{props.subtitle}</div>
          ) : null}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => props.onSnapChange("collapsed")}
            style={btnStyle(props.snap === "collapsed")}
          >
            —
          </button>
          <button
            onClick={() => props.onSnapChange("medium")}
            style={btnStyle(props.snap === "medium")}
          >
            ▢
          </button>
          <button
            onClick={() => props.onSnapChange("large")}
            style={btnStyle(props.snap === "large")}
          >
            ⬆︎
          </button>
        </div>
      </div>

      <div style={{ padding: 12, paddingTop: 0, overflowY: "auto", height: snapPx - 64 }}>
        {props.children}
      </div>
    </div>
  );
}

function btnStyle(active: boolean): React.CSSProperties {
  return {
    border: "1px solid var(--border)",
    background: active ? "rgba(96,165,250,0.12)" : "rgba(255,255,255,0.04)",
    color: "var(--fg)",
    borderRadius: 12,
    padding: "8px 10px",
    fontSize: 12,
    cursor: "pointer",
  };
}
