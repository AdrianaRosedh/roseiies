export default function Page() {
  return (
    <main className="min-h-screen text-(--rose-ink)">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-10">
        {/* Top bar */}
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src="/brand/roseiies.svg"
              alt="Roseiies"
              className="h-5 w-auto opacity-80"
              draggable={false}
            />
            <span className="text-sm tracking-wide text-(--rose-muted)">Marketing</span>
          </div>

          <nav className="flex items-center gap-3">
            <a className="rose-btn px-4 py-2 text-sm" href="#">
              Docs
            </a>
            <a className="rose-btn-primary px-4 py-2 text-sm" href="#">
              Request access
            </a>
          </nav>
        </header>

        {/* Hero */}
        <section className="flex flex-1 flex-col justify-center py-16">
          <img
            src="/brand/roseiies.svg"
            alt="Roseiies"
            className="h-16 w-auto md:h-24"
            draggable={false}
          />

          <p className="mt-6 max-w-2xl text-pretty text-base leading-relaxed text-(--rose-muted) md:text-lg">
            A multi-tenant hospitality intelligence platform. One truth layer —
            projected into role-based experiences for guests, gardeners, and kitchens.
          </p>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a href="#" className="rose-btn-primary px-6 py-3 text-sm font-medium rounded-2xl">
              Explore the Garden App
            </a>
            <a href="#" className="rose-btn px-6 py-3 text-sm font-medium rounded-2xl">
              See how multi-tenant works
            </a>
          </div>

          <div className="mt-14 grid gap-4 md:grid-cols-3">
            {[
              {
                title: "One truth layer",
                body: "A single data model powering every experience — no duplication, no drift.",
              },
              {
                title: "Role projections",
                body: "Guest, gardener, kitchen — each sees exactly what they need from the same source.",
              },
              {
                title: "Spatial intelligence",
                body: "Beds as anchors. Optional pins (0..1 coords) that survive zoom and resize.",
              },
            ].map((c) => (
              <div key={c.title} className="rose-surface rounded-3xl p-5 shadow-sm">
                <div className="text-sm font-semibold text-(--rose-ink)">{c.title}</div>
                <div className="mt-2 text-sm leading-relaxed text-(--rose-muted)">
                  {c.body}
                </div>
              </div>
            ))}
          </div>
        </section>

        <footer className="pb-8 text-xs text-(--rose-muted)">
          © {new Date().getFullYear()} Roseiies — built as a platform, proven in Olivea.
        </footer>
      </div>
    </main>
  );
}
