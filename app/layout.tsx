import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { RegisterSW } from "./register-sw";
import { InstallPrompt } from "./install-prompt";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: "Topside",
  title: "Topside — VPS cockpit",
  description: "Mobile-first web cockpit for a headless Linux VPS.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Topside", statusBarStyle: "black-translucent" },
  icons: { icon: "/icon-192.png", apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Draw under the notch / home-bar so the shell's safe-area-inset padding
  // (--sai-*) actually has insets to work with in standalone mode.
  viewportFit: "cover",
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Geist variable classes MUST live on <html>: --font-ui/--font-mono-ui are
  // defined on :root and reference var(--font-geist-*) — defined only on
  // <body>, the :root custom property is invalid at computed-value time and
  // silently collapses to the Tailwind preflight stack (fonts never apply).
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="antialiased overflow-hidden select-none">
        {/* Pre-hydration theme: AppearanceProvider applies tweaks in a
            post-hydration effect, which gave dark-theme users a light flash on
            every cold load. This parser-blocking script sets data-theme before
            first paint (html has suppressHydrationWarning for the attr swap). */}
        <script
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
