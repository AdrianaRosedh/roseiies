"use client";

import { useRef } from "react";
import type { AttachmentItem } from "../types";

export default function AttachmentEditor({
  value,
  onChange,
  onDone,
}: {
  value: AttachmentItem[];
  onChange: (next: AttachmentItem[]) => void;
  onDone: () => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  async function onPick(files: FileList | null) {
    if (!files || !files.length) return;

    const next: AttachmentItem[] = [];
    for (const f of Array.from(files)) {
      const dataUrl = await fileToDataUrl(f);
      next.push({ name: f.name, dataUrl });
    }

    onChange([...(value ?? []), ...next]);
  }

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => onPick(e.target.files)}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="rounded-md border border-black/10 bg-white px-2 py-1 text-xs text-black/70 hover:bg-black/5"
      >
        Upload
      </button>

      <button
        type="button"
        onClick={() => onDone()}
        className="rounded-md border border-black/10 bg-black/5 px-2 py-1 text-xs text-black/70 hover:bg-black/10"
      >
        Done
      </button>

      {value?.length ? (
        <button
          type="button"
          onClick={() => onChange([])}
          className="ml-auto rounded-md border border-black/10 bg-white px-2 py-1 text-xs text-black/55 hover:bg-black/5"
          title="Remove attachments"
        >
          Clear
        </button>
      ) : null}
    </div>
  );
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result ?? ""));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
