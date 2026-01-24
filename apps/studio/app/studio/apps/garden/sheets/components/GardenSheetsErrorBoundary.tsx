"use client";

import React from "react";

export default class GardenSheetsErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: any }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, info: any) {
    console.error("GardenSheets crashed:", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="p-6">
        <div className="rounded-xl border border-black/10 bg-white/70 p-5">
          <div className="text-sm font-semibold text-black/80">
            Sheets crashed (client-side error)
          </div>
          <div className="mt-2 text-sm text-black/60">
            Check the console for the full stack.
          </div>
          <pre className="mt-3 max-h-60 overflow-auto rounded-lg border border-black/10 bg-white p-3 text-xs text-black/70">
{String(this.state.error?.message ?? this.state.error ?? "Unknown error")}
          </pre>
        </div>
      </div>
    );
  }
}
