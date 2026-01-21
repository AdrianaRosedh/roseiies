"use client";

import Link from "next/link";

export type AppTile = {
  id: string;
  name: string;
  description: string;
  status?: "live" | "beta" | "soon";
};

export default function WorkplaceHome({
  apps,
  onOpen,
}: {
  apps: AppTile[];
  onOpen?: (id: string) => void;
}) {
  const safeOpen =
    typeof onOpen === "function"
      ? onOpen
      : (id: string) => {
          console.warn("[WorkplaceHome] onOpen missing/not a function:", id);
        };

  return (
    <div className="w-full">
      <h1 className="text-2xl font-semibold tracking-tight">Workplace</h1>
      <p className="mt-1 text-sm text-black/60">
        Choose an app. Same truth layer — different projections.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {apps.map((app) => {
          const isDisabled = app.status === "soon";
          const href = `/app/${app.id}`;

          const inner = (
            <>
              <div className="flex items-start justify-between gap-4">
                <div className="text-base font-semibold">{app.name}</div>
                {app.status ? (
                  <span className="rounded-full border border-black/10 bg-black/5 px-2 py-1 text-[11px] uppercase tracking-wide text-black/60">
                    {app.status}
                  </span>
                ) : null}
              </div>

              <div className="mt-2 text-sm text-black/60">{app.description}</div>

              <div className="mt-4 text-sm font-medium text-black/70 group-hover:text-black">
                {isDisabled ? "Coming soon" : "Open →"}
              </div>
            </>
          );

          if (isDisabled) {
            return (
              <div
                key={app.id}
                className="group rounded-2xl border border-black/10 bg-white/40 p-5 text-left shadow-sm backdrop-blur opacity-60"
                aria-disabled="true"
              >
                {inner}
              </div>
            );
          }

          return (
            <Link
              key={app.id}
              href={href}
              onClick={() => safeOpen(app.id)}
              className="group block rounded-2xl border border-black/10 bg-white/55 p-5 text-left shadow-sm backdrop-blur transition hover:bg-white/75 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-black/20"
            >
              {inner}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
