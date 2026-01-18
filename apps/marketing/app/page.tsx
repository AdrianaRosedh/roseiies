export default function Page() {
  return (
    <main className="min-h-screen text-black">
      {/* Moving melted field */}
      <div className="roseiies-bg">
        <div className="roseiies-field" />
        <div className="roseiies-veil" />
        <div className="roseiies-grain" />
      </div>

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
            <span className="text-sm tracking-wide text-black/45">Marketing</span>
          </div>

          <nav className="flex items-center gap-3">
            <a
              href="#"
              className="rounded-full border border-black/10 bg-white/55 px-4 py-2 text-sm text-black/70 backdrop-blur-md hover:bg-white/75"
            >
              Docs
            </a>
            <a
              href="#"
              className="rounded-full px-4 py-2 text-sm text-white hover:opacity-95"
              style={{ backgroundColor: "#010506" }}
            >
              Request access
            </a>
          </nav>
        </header>

        {/* Hero (LEFT aligned) */}
        <section className="flex flex-1 flex-col justify-center py-16">
          <div className="max-w-3xl">
            {/* ✅ left aligned logo */}
            <img
              src="/brand/roseiies.svg"
              alt="Roseiies"
              className="h-16 w-auto md:h-24"
              draggable={false}
            />

            <p className="mt-6 max-w-2xl text-pretty text-base leading-relaxed text-black/70 md:text-lg">
              A multi-tenant hospitality intelligence platform. One truth layer —
              projected into role-based experiences for guests, gardeners, and kitchens.
            </p>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
              <a
                href="#"
                className="inline-flex items-center justify-center rounded-2xl px-6 py-3 text-sm font-medium text-white hover:opacity-95"
                style={{ backgroundColor: "#010506" }}
              >
                Explore the Garden App
              </a>

              <a
                href="#"
                className="inline-flex items-center justify-center rounded-2xl border border-black/10 bg-white/55 px-6 py-3 text-sm font-medium text-black/80 backdrop-blur-md hover:bg-white/75"
              >
                See how multi-tenant works
              </a>
            </div>

            {/* Cards */}
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
                <div
                  key={c.title}
                  className="rounded-3xl border border-black/10 bg-white/45 p-5 shadow-sm backdrop-blur-xl"
                >
                  <div className="text-sm font-semibold text-black">{c.title}</div>
                  <div className="mt-2 text-sm leading-relaxed text-black/70">
                    {c.body}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <footer className="pb-8 text-xs text-black/50">
          © {new Date().getFullYear()} Roseiies — built as a platform, proven in Olivea.
        </footer>
      </div>
    </main>
  );
}
