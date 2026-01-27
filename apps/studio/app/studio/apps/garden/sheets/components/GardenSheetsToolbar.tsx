"use client";

import React from "react";
import { tbBtn } from "../../../../editor-core/shell/components/toolbarStyles";

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
        <button onClick={onGoDesign} className={tbBtn("ghost")}>
          Map
        </button>
      ) : null}

      {onDeleteSelected ? (
        <button
          onClick={onDeleteSelected}
          className={tbBtn("ghost")}
          title="Delete selected"
        >
          Trash
        </button>
      ) : null}

      <button
        onClick={() => onAddColumn()}
        className={tbBtn("ghost")}
        title="Add a column"
      >
        + Column
      </button>

      <button onClick={() => onRefresh()} className={tbBtn("ghost")}>
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
