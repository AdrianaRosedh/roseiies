import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-(--rose-bg) text-(--rose-ink)">
        {/* Marketing background (always on) */}
        <div className="roseiies-marketing-bg" aria-hidden="true">
          <div className="roseiies-marketing-field" />
          <div className="roseiies-marketing-veil" />
          <div className="roseiies-marketing-grain" />
        </div>

        {children}
      </body>
    </html>
  );
}
