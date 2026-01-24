"use client";

export default function PoweredBy(props: {
  text?: string;
  className?: string;
}) {
  const text = props.text ?? "Powered by Roseiies";
  return (
    <div
      className={
        props.className ??
        "fixed bottom-3 right-3 text-[11px] opacity-60 pointer-events-none select-none"
      }
    >
      {text}
    </div>
  );
}
