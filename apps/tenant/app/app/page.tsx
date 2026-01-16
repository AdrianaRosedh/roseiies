import Link from "next/link";
import { getRequestTheme } from "../lib/tenant";

export default async function AppHome() {
  const theme = await getRequestTheme();

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-12">
      <h1 className="text-2xl font-semibold">{theme.displayName} — Team</h1>
      <p className="mt-3 text-sm opacity-80">Private surface.</p>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <Link
          className="rounded-xl border border-white/10 p-5 hover:bg-white/5"
          href="/app/garden/map"
        >
          Garden Map
        </Link>
        <Link
          className="rounded-xl border border-white/10 p-5 hover:bg-white/5"
          href="/app/garden/capture"
        >
          Capture
        </Link>
        <Link
          className="rounded-xl border border-white/10 p-5 hover:bg-white/5"
          href="/app/garden/pulse"
        >
          Pulse
        </Link>
      </div>
    </main>
  );
}