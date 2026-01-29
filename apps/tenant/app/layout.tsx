import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className="h-dvh overflow-hidden bg-(--bg) text-(--fg)"
        style={{
          ["--bg" as any]: "var(--rose-bg)",
          ["--fg" as any]: "var(--rose-ink)",
          ["--accent" as any]: "var(--rose-blue)",
        }}
      >
        {/* Roseiies tenant background */}
        <div className="roseiies-tenant-bg" aria-hidden="true">
          <div className="roseiies-tenant-field" />
          <div className="roseiies-tenant-veil" />
        </div>

        {children}
      </body>
    </html>
  );
}
