"use client";

function IconSearch(props: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      aria-hidden="true"
      className={props.className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}

function IconX(props: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      aria-hidden="true"
      className={props.className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6L6 18" />
      <path d="M6 6l12 12" />
    </svg>
  );
}

export default function SearchBar(props: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;

  onFocus?: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}) {
  return (
    <div
      className={[
        "pointer-events-auto rounded-2xl border border-(--rose-border) bg-(--rose-surface)/88 backdrop-blur shadow-sm",
        "px-3 py-2",
        props.className ?? "",
      ].join(" ")}
    >
      <div className="flex items-center gap-2">
        <IconSearch className="text-black/50" />
        <input
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          onFocus={props.onFocus}
          onKeyDown={props.onKeyDown}
          placeholder={props.placeholder ?? "Search crops, beds…"}
          className="w-[min(520px,70vw)] bg-transparent outline-none text-sm text-(--rose-ink) placeholder:text-black/45"
        />
        {props.value ? (
          <button
            onClick={() => props.onChange("")}
            className="rounded-full p-1 hover:bg-black/5 active:scale-[0.98]"
            aria-label="Clear search"
            type="button"
          >
            <IconX className="text-black/45" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
