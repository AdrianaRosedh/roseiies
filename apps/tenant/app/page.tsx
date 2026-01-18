import "./globals.css";
import type { ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen text-(--rose-ink) bg-transparent">
        <div className="roseiies-tenant-bg" aria-hidden="true">
          <div className="roseiies-tenant-field" />
          <div className="roseiies-tenant-veil" />
        </div>

        {children}
      </body>
    </html>
  );
}
