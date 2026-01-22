"use client";

export default function CollapsedRail(props: {
  side: "left" | "right";
  title: string;
  onExpand: () => void;
}) {
  const Icon = props.side === "left" ? IconChevronRight : IconChevronLeft;

  return (
    <button
      onClick={props.onExpand}
      className="h-full w-full flex flex-col items-center justify-center gap-2 hover:bg-black/2 transition-colors"
      title={`Show ${props.title}`}
      aria-label={`Show ${props.title}`}
      type="button"
    >
      <span className="opacity-70 hover:opacity-95 transition-opacity">
        <Icon />
      </span>

      <span
        className="text-[10px] text-black/35 tracking-wide select-none"
        style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
      >
        {props.title}
      </span>
    </button>
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
