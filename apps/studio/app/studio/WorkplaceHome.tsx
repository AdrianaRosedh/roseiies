"use client";

type AppTile = {
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
  onOpen: (id: string) => void;
}) {
  return (
    <div className="min-h-screen bg-[#fbfbfb] text-black">
      <header className="mx-auto max-w-6xl px-8 pt-10">
        <div className="text-sm opacity-60">Roseiies Studio</div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Workplace
        </h1>
        <p className="mt-2 max-w-2xl text-sm opacity-70">
          One studio, many apps — each projecting the same truth layer in a different way.
        </p>
      </header>

      <main className="mx-auto max-w-6xl px-8 py-10">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {apps.map((app) => (
            <button
              key={app.id}
              onClick={() => onOpen(app.id)}
              className="group rounded-2xl border border-black/10 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="text-lg font-semibold">{app.name}</div>
                {app.status ? (
                  <span className="rounded-full border border-black/10 bg-black/5 px-2 py-1 text-[11px] uppercase tracking-wide opacity-70">
                    {app.status}
                  </span>
                ) : null}
              </div>

              <div className="mt-2 text-sm opacity-70">{app.description}</div>

              <div className="mt-4 text-sm font-medium opacity-80 group-hover:opacity-100">
                Open →
              </div>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
