import Link from "next/link";
import { getRequestTheme } from "../lib/tenant";

export default async function GardenPublic() {
  const theme = await getRequestTheme();

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-12">
      <div className="flex items-center justify-between gap-6">
        <h1 className="text-2xl font-semibold">{theme.displayName} — Garden</h1>

        <Link
          href="/app"
          className="rounded-md border border-white/15 px-4 py-2 text-sm hover:bg-white/5"
        >
          Team →
        </Link>
      </div>

      <p className="mt-4 max-w-2xl text-sm opacity-80">
        Public, curated view. No sign-in required.
      </p>

      <section className="mt-10 rounded-2xl border border-white/10 p-6">
        <div className="text-sm opacity-70">Garden Map (curated) — placeholder</div>
        <div className="mt-4 h-105 rounded-xl bg-white/5" />
      </section>
    </main>
  );
}