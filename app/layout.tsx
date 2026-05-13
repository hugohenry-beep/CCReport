import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { Logo } from "./components/Logo";
import ThemeToggle from "./components/ThemeToggle";
import { EnvBadge } from "./components/EnvBadge";
import { TooltipProvider } from "./components/ui/Tooltip";

const sans = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});
const display = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: { default: "Inbound Lead Report", template: "%s · Inbound Lead Report" },
  description: "HubSpot + Google Ads inbound performance reports — automated, comparable, shareable.",
  applicationName: "Inbound Lead Report",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
  },
  openGraph: {
    title: "Inbound Lead Report",
    description: "HubSpot + Google Ads inbound performance reports — automated, comparable, shareable.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Inbound Lead Report",
    description: "HubSpot + Google Ads inbound performance reports.",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0c10" },
    { media: "(prefers-color-scheme: light)", color: "#f7f8fb" },
  ],
};

// Inline script that runs before paint to set the theme attribute and avoid FOUC.
const themeInitScript = `
(function(){try{
  var k='ilr-theme';
  var s=localStorage.getItem(k);
  var t=(s==='light'||s==='dark')?s:(window.matchMedia&&window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark');
  document.documentElement.dataset.theme=t;
  document.documentElement.style.colorScheme=t;
}catch(e){document.documentElement.dataset.theme='dark';}})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" className={`${sans.variable} ${display.variable} ${mono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="font-sans">
        <a href="#main" className="skip-link">Skip to content</a>
        <TooltipProvider delayDuration={300}>
          <div className="min-h-screen flex flex-col">
            <header className="sticky top-0 z-30 border-b border-border bg-bg/85 backdrop-blur supports-[backdrop-filter]:bg-bg/70">
              <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Link
                    href="/"
                    className="flex items-center rounded-md outline-none transition-opacity hover:opacity-90"
                    aria-label="Go to home"
                  >
                    <Logo />
                  </Link>
                  <EnvBadge />
                </div>
                <div className="flex items-center gap-1.5">
                  <Link
                    href="/"
                    className="hidden sm:inline-flex h-9 items-center rounded-md px-3 text-sm font-medium text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
                  >
                    New report
                  </Link>
                  <ThemeToggle />
                </div>
              </div>
            </header>
            <main id="main" className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 flex-1">
              {children}
            </main>
            <footer className="border-t border-border bg-surface/50">
              <div className="max-w-6xl mx-auto px-4 sm:px-6 h-12 flex items-center justify-between text-xs text-text-subtle">
                <span>Inbound Lead Report</span>
                <span>HubSpot · Google Ads · LLM narrative</span>
              </div>
            </footer>
          </div>
        </TooltipProvider>
      </body>
    </html>
  );
}
