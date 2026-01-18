import Link from "next/link";
import { getRequestTheme } from "@lib/tenant";

export default async function TeamHomePage() {
  const theme = await getRequestTheme();

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12">
      <h1 className="text-2xl font-semibold">{theme.displayName} — Team</h1>
      <p className="mt-3 text-sm opacity-80">Private operational surface.</p>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <Link
          className="rounded-xl border border-white/10 bg-white/5 p-5 hover:bg-white/10"
          href="/app/garden/map"
        >
          Garden Map
          <div className="mt-2 text-xs opacity-60">Full map + publish controls</div>
        </Link>

        <Link
          className="rounded-xl border border-white/10 bg-white/5 p-5 hover:bg-white/10"
          href="/app/garden/capture"
        >
          Capture
          <div className="mt-2 text-xs opacity-60">Log harvests & observations</div>
        </Link>

        <Link
          className="rounded-xl border border-white/10 bg-white/5 p-5 hover:bg-white/10"
          href="/app/garden/pulse"
        >
          Pulse
          <div className="mt-2 text-xs opacity-60">This week at a glance</div>
        </Link>
      </div>
    </main>
  );
}