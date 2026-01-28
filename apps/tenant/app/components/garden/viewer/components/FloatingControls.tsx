"use client";

export default function FloatingControls(props: { onReset: () => void }) {
  return (
    <div className="fixed bottom-24 right-4 z-75 pointer-events-auto">
      <button
        onClick={props.onReset}
        className="rounded-2xl border border-(--rose-border) bg-(--rose-surface)/85 backdrop-blur px-3 py-2 text-sm text-(--rose-ink) shadow-sm active:scale-[0.99]"
      >
        Reset view
      </button>
    </div>
  );
}
