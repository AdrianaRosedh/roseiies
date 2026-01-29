"use client";

export default function FloatingControls(props: { onReset: () => void }) {
  return (
    <button
      type="button"
      onClick={props.onReset}
      style={{
        border: "1px solid var(--border)",
        background: "rgba(0,0,0,0.35)",
        color: "var(--fg)",
        borderRadius: 14,
        padding: "10px 12px",
        fontSize: 12,
        cursor: "pointer",
        backdropFilter: "blur(10px)",
      }}
      title="Reset view"
    >
      Reset
    </button>
  );
}
