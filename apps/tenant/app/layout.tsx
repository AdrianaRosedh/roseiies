import "./globals.css";
import { getRequestTheme } from "./lib/tenant";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const theme = await getRequestTheme();

  return (
    <html lang="en">
      <body
        style={{
          // ✅ Force Roseiies OS look for tenant UI
          ["--bg" as any]: "var(--rose-bg)",
          ["--fg" as any]: "var(--rose-ink)",

          // Keep tenant accent if provided, otherwise default to Roseiies blue
          ["--accent" as any]: theme.colors?.accent ?? "var(--rose-blue)",
        }}
        className="min-h-screen bg-(--bg) text-(--fg)"
      >
        {/* ✅ Subtle Roseiies background like Studio */}
        <div className="roseiies-tenant-bg" aria-hidden="true">
          <div className="roseiies-tenant-field" />
          <div className="roseiies-tenant-veil" />
        </div>

        {children}

        {theme.poweredByRoseiies && (
          <div className="fixed bottom-3 right-3 text-[11px] text-(--rose-muted) opacity-80">
            Powered by Roseiies
          </div>
        )}
      </body>
    </html>
  );
}
