"use client";

import React from "react";

export default function SearchBar(props: {
  value: string;
  onChange: (v: string) => void;
  onFocus?: () => void;
  placeholder?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}) {
  return (
    <div
      className="rounded-2xl border"
      style={{
        borderColor: "var(--border)",
        background: "rgba(0,0,0,0.35)",
        backdropFilter: "blur(10px)",
        padding: 10,
        width: 360,
        maxWidth: "80vw",
      }}
    >
      <input
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        onFocus={props.onFocus}
        onKeyDown={props.onKeyDown}
        placeholder={props.placeholder ?? "Search…"}
        className="w-full bg-transparent outline-none"
        style={{ color: "var(--fg)", fontSize: 13 }}
      />
      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>
        Tip: search crops, beds, notes.
      </div>
    </div>
  );
}
