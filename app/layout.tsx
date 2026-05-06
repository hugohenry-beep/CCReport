import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Inbound Lead Report",
  description: "HubSpot + Google Ads weekly inbound report generator",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen">
          <header className="border-b border-[var(--border)] bg-[var(--panel)]">
            <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
              <a href="/" className="font-semibold text-lg">Inbound Lead Report</a>
              <a href="/" className="text-sm text-[var(--text-muted)] hover:text-white">New report</a>
            </div>
          </header>
          <main className="max-w-5xl mx-auto px-6 py-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
