import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { RegisterSW } from "./register-sw";
import { InstallPrompt } from "./install-prompt";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://os.rahmanef.com"),
  applicationName: "Manef Shell OS",
  title: "Manef Shell OS — browser-based server control plane",
  description: "A browser-based graphical shell for a Linux server you own — terminal, files, metrics, and AI in one mobile-first pane.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "MSO", statusBarStyle: "black-translucent" },
  // Favicon + apple-touch + OG come from the file conventions (app/icon.svg,
  // app/apple-icon.tsx, app/opengraph-image.tsx) — no manual `icons` field.
  openGraph: {
    title: "Manef Shell OS — browser-based server control plane",
    description: "A browser-based graphical shell for a Linux server you own — terminal, files, metrics, and AI in one mobile-first pane.",
    siteName: "Manef Shell OS",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Manef Shell OS — browser-based server control plane",
    description: "A browser-based graphical shell for a Linux server you own — terminal, files, metrics, and AI in one mobile-first pane.",
  },
  // Owner-only tool behind client auth — keep it out of search indexes (every
  // catch-all slug returns 200 HTML). The GitHub repo is the discoverable surface.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Draw under the notch / home-bar so the shell's safe-area-inset padding
  // (--sai-*) actually has insets to work with in standalone mode.
  viewportFit: "cover",
  themeColor: "#0a0a0a",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Per-request nonce (set by proxy.ts) so the pre-hydration theme script passes
  // the strict CSP script-src.
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  // Geist variable classes MUST live on <html>: --font-ui/--font-mono-ui are
  // defined on :root and reference var(--font-geist-*) — defined only on
  // <body>, the :root custom property is invalid at computed-value time and
  // silently collapses to the Tailwind preflight stack (fonts never apply).
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="antialiased overflow-hidden select-none">
        {/* Pre-hydration theme: set data-theme from localStorage before the body
            paints (dark users otherwise get a light flash). A raw nonced <script>
            at body-top runs synchronously during parse; the nonce (proxy.ts →
            x-nonce header) satisfies the strict CSP script-src. */}
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html:
              'try{var t=JSON.parse(localStorage.getItem("os-vps:tweaks"));if(t&&t.theme)document.documentElement.dataset.theme=t.theme;}catch(e){}',
          }}
        />
        {children}
        <RegisterSW />
        <InstallPrompt />
      </body>
    </html>
  );
}
