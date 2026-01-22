"use client";

export default function PanelHeader(props: {
  title: string;
  side: "left" | "right";
  onCollapse: () => void;
}) {
  const Icon = props.side === "left" ? IconChevronLeft : IconChevronRight;

  return (
    <div className="flex items-center justify-between">
      <div className="text-sm font-semibold text-black/85">{props.title}</div>
      <button
        onClick={props.onCollapse}
        className="inline-flex items-center justify-center rounded-lg border border-black/10 bg-white/80 px-2.5 py-2 text-xs shadow-sm hover:bg-white"
        title="Collapse"
        aria-label="Collapse"
        type="button"
      >
        <Icon />
      </button>
    </div>
  );
}

function IconChevronLeft() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M12.5 4.5L7.5 10l5 5.5"
        stroke="rgba(15,23,42,0.7)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function IconChevronRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M7.5 4.5L12.5 10l-5 5.5"
        stroke="rgba(15,23,42,0.7)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
