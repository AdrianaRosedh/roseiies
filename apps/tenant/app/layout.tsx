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
          ["--bg" as any]: theme.colors.background,
          ["--fg" as any]: theme.colors.foreground,
          ["--accent" as any]: theme.colors.accent,
        }}
        className="min-h-screen bg-(--bg) text-(--fg)"
      >
        {children}

        {theme.poweredByRoseiies && (
          <div className="fixed bottom-3 right-3 text-[11px] opacity-60">
            Powered by Roseiies
          </div>
        )}
      </body>
    </html>
  );
}