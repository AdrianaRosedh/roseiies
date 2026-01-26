"use client";

import React from "react";

export default function GardenSheetsToolbar(props: {
  loading: boolean;
  lastError: string | null;

  onRefresh: () => void | Promise<void>;
  onAddColumn: () => unknown | Promise<unknown>;

  onGoDesign?: () => void;
  onDeleteSelected?: (() => void) | undefined;
}) {
  const {
    loading,
    lastError,
    onRefresh,
    onAddColumn,
    onGoDesign,
    onDeleteSelected,
  } = props;

  return (
    <>
      {onGoDesign ? (
        <button
          onClick={onGoDesign}
          className="rounded-lg border border-black/10 bg-white/70 px-3 py-2 text-sm hover:bg-white"
        >
          Map
        </button>
      ) : null}

      {onDeleteSelected ? (
        <button
          onClick={onDeleteSelected}
          className="rounded-lg border border-black/10 bg-white/70 px-3 py-2 text-sm hover:bg-white"
          title="Delete selected"
        >
          Trash
        </button>
      ) : null}

      <button
        onClick={() => onAddColumn()}
        className="rounded-lg border border-black/10 bg-white/70 px-3 py-2 text-sm hover:bg-white"
        title="Add a column"
      >
        + Column
      </button>

      <button
        onClick={() => onRefresh()}
        className="rounded-lg border border-black/10 bg-white/70 px-3 py-2 text-sm hover:bg-white"
      >
        {loading ? "Refreshing…" : "Refresh"}
      </button>

      {lastError ? (
        <span className="ml-2 text-xs text-rose-700/80 truncate max-w-[40vw]">
          {lastError}
        </span>
      ) : null}
    </>
  );
}