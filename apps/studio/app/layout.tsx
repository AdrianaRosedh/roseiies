import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen text-black bg-transparent">
        {/* Subtle Roseiies Studio background */}
        <div className="roseiies-studio-bg" aria-hidden="true">
          <div className="roseiies-studio-field" />
          <div className="roseiies-studio-veil" />
        </div>

        {children}
      </body>
    </html>
  );
}
