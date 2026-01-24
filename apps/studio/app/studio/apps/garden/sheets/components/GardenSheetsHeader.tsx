"use client";

import { useEffect, useState } from "react";
import type { ColType, Column } from "../types";

export default function GardenSheetsHeader(props: {
  cols: Column[];
  setCols: (updater: (prev: Column[]) => Column[]) => void;
}) {
  const { cols, setCols } = props;

  const [renaming, setRenaming] = useState<{ colKey: string } | null>(null);
  const [renameDraft, setRenameDraft] = useState("");

  const [colConfig, setColConfig] = useState<{ colKey: string } | null>(null);

  function addColumnInline() {
    const key = `field_${Math.random().toString(16).slice(2)}`;
    const newCol: Column = { key, label: "New field", type: "text", width: 180 };
    setCols((prev) => [...prev, newCol]);
    setRenaming({ colKey: key });
    setRenameDraft("New field");
  }

  function beginRename(colKey: string, currentLabel: string) {
    setRenaming({ colKey });
    setRenameDraft(currentLabel);
  }

  function commitRename() {
    if (!renaming) return;
    const { colKey } = renaming;
    const name = renameDraft.trim();

    setRenaming(null);
    setRenameDraft("");

    if (!name) return;

    setCols((prev) =>
      prev.map((c) => (String(c.key) === colKey ? { ...c, label: name } : c))
    );
  }

  function setColumnType(colKey: string, type: ColType) {
    setCols((prev) =>
      prev.map((c) => {
        if (String(c.key) !== colKey) return c;

        const next: Column = { ...c, type };

        // maintain select options when needed
        if (type === "select" && !next.options) next.options = { values: [] };
        if (type !== "select") delete (next as any).options;

        return next;
      })
    );
  }

  function setSelectOptions(colKey: string, values: string[]) {
    setCols((prev) =>
      prev.map((c) =>
        String(c.key) === colKey ? { ...c, options: { values } } : c
      )
    );
  }

  // close popover on outside click
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const el = e.target as HTMLElement | null;
      if (!el) return;
      if (el.closest?.("[data-col-popover]")) return;
      setColConfig(null);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div className="flex border-b border-black/10 bg-white/70">
      {cols.map((c) => {
        const key = String(c.key);
        const isRenaming = renaming?.colKey === key;

        return (
          <div
            key={key}
            className="relative px-3 py-2 text-xs font-semibold text-black/70 border-r border-black/10 last:border-r-0"
            style={{ width: c.width ?? 180 }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                {isRenaming ? (
                  <input
                    autoFocus
                    value={renameDraft}
                    onChange={(e) => setRenameDraft(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitRename();
                      if (e.key === "Escape") {
                        setRenaming(null);
                        setRenameDraft("");
                      }
                    }}
                    className="w-full rounded-md border border-black/10 bg-white px-2 py-1 text-xs font-semibold text-black/80"
                  />
                ) : (
                  <button
                    className="max-w-full truncate text-left hover:underline"
                    onClick={() => beginRename(key, c.label)}
                    title="Rename column"
                  >
                    {c.label}
                  </button>
                )}

                <div className="mt-0.5 text-[10px] font-medium text-black/40 uppercase tracking-wide">
                  {c.type}
                </div>
              </div>

              <button
                onClick={() =>
                  setColConfig((prev) =>
                    prev?.colKey === key ? null : { colKey: key }
                  )
                }
                className="shrink-0 rounded-md border border-black/10 bg-white/70 px-2 py-1 text-[11px] text-black/60 hover:bg-white"
                title="Column settings"
                data-col-popover
              >
                ⋯
              </button>
            </div>

            {colConfig?.colKey === key ? (
              <div
                className="absolute right-2 top-11 z-20 w-56 rounded-xl border border-black/10 bg-white shadow-lg p-3"
                data-col-popover
              >
                <div className="text-[11px] font-semibold text-black/65">
                  Column type
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2">
                  {(
                    ["text", "number", "date", "checkbox", "select", "attachment"] as ColType[]
                  ).map((t) => (
                    <button
                      key={t}
                      onClick={() => setColumnType(key, t)}
                      className={`rounded-lg border px-2 py-1 text-xs transition ${
                        c.type === t
                          ? "border-black/20 bg-black/5 text-black/80"
                          : "border-black/10 bg-white text-black/70 hover:bg-black/5"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                {cols.find((x) => String(x.key) === key)?.type === "select" ? (
                  <div className="mt-3">
                    <div className="text-[11px] font-semibold text-black/65">
                      Options (comma-separated)
                    </div>
                    <input
                      className="mt-2 w-full rounded-lg border border-black/10 bg-white px-2 py-1 text-xs"
                      defaultValue={(c.options?.values ?? []).join(", ")}
                      onBlur={(e) => {
                        const raw = e.target.value;
                        const values = raw
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean);
                        setSelectOptions(key, values);
                      }}
                    />
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}

      <button
        onClick={addColumnInline}
        className="px-3 py-2 text-xs font-semibold text-black/55 hover:text-black/80"
        style={{ width: 54 }}
        title="Add column"
      >
        +
      </button>
    </div>
  );
}